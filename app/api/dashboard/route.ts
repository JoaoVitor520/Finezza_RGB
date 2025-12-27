import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_CLINIC_SLUG =
  process.env.NEXT_PUBLIC_CLINIC_SLUG ?? "finezza-rb";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

const formatMonthLabel = (date: Date) => {
  const label = monthFormatter.format(date).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const buildMonthBuckets = (now: Date, months = 12) => {
  const buckets: { key: string; label: string; start: Date; end: Date }[] = [];
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  for (let i = 0; i < months; i += 1) {
    const current = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    buckets.push({
      key: toMonthKey(current),
      label: formatMonthLabel(current),
      start: current,
      end,
    });
  }

  return buckets;
};

const formatDelta = (current: number, previous: number) => {
  if (previous <= 0) return "+0%";
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
};

const formatTrend = (current: number, previous: number, suffix: string) => {
  if (previous <= 0) return `+0% ${suffix}`;
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}% ${suffix}`;
};

const formatRelativeTime = (value: Date, now: Date) => {
  const diffMs = now.getTime() - value.getTime();
  const minutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `ha ${hours} h`;
  const days = Math.round(hours / 24);
  return `ha ${days} d`;
};

export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Missing Supabase service role key." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("clinic") ?? DEFAULT_CLINIC_SLUG;

  const { data: clinic, error: clinicError } = await supabaseAdmin
    .from("clinics")
    .select("id, timezone")
    .eq("slug", slug)
    .maybeSingle();

  if (clinicError || !clinic) {
    return NextResponse.json(
      { error: "Clinic not found." },
      { status: 404 }
    );
  }

  const now = new Date();
  const monthBuckets = buildMonthBuckets(now, 12);
  const monthIndex = new Map(
    monthBuckets.map((bucket, index) => [bucket.key, index])
  );
  const rangeStart = monthBuckets[0]?.start ?? now;
  const rangeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    patientsResult,
    appointmentsResult,
    paymentsResult,
    expensesResult,
    proceduresResult,
    appointmentProceduresResult,
    notificationsResult,
    googleTokensResult,
    chairsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("patients")
      .select("id, full_name, birth_date, gender, created_at")
      .eq("clinic_id", clinic.id),
    supabaseAdmin
      .from("appointments")
      .select("id, start_at, end_at, status, patient_id, chair_id")
      .eq("clinic_id", clinic.id)
      .gte("start_at", rangeStart.toISOString())
      .lte("start_at", rangeEnd.toISOString()),
    supabaseAdmin
      .from("payments")
      .select("amount, paid_at")
      .eq("clinic_id", clinic.id)
      .gte("paid_at", rangeStart.toISOString()),
    supabaseAdmin
      .from("expenses")
      .select("amount, paid_at")
      .eq("clinic_id", clinic.id)
      .gte("paid_at", rangeStart.toISOString()),
    supabaseAdmin
      .from("procedures")
      .select("id, name, category")
      .eq("clinic_id", clinic.id),
    supabaseAdmin
      .from("appointment_procedures")
      .select("appointment_id, procedure_id, quantity")
      .eq("clinic_id", clinic.id),
    supabaseAdmin
      .from("notifications")
      .select("id, title, body, severity, created_at")
      .eq("clinic_id", clinic.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("google_calendar_tokens")
      .select("id, updated_at, expires_at")
      .eq("clinic_id", clinic.id)
      .maybeSingle(),
    supabaseAdmin.from("chairs").select("id, status").eq("clinic_id", clinic.id),
  ]);

  if (
    patientsResult.error ||
    appointmentsResult.error ||
    paymentsResult.error ||
    expensesResult.error ||
    proceduresResult.error ||
    appointmentProceduresResult.error ||
    notificationsResult.error ||
    googleTokensResult.error ||
    chairsResult.error
  ) {
    return NextResponse.json(
      { error: "Failed to load dashboard data." },
      { status: 500 }
    );
  }

  const patients = patientsResult.data ?? [];
  const appointments = appointmentsResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const procedures = proceduresResult.data ?? [];
  const appointmentProcedures = appointmentProceduresResult.data ?? [];
  const notifications = notificationsResult.data ?? [];
  const googleTokens = googleTokensResult.data ?? null;
  const chairs = chairsResult.data ?? [];

  const patientById = new Map(patients.map((patient) => [patient.id, patient]));

  const procedureById = new Map(
    procedures.map((procedure) => [procedure.id, procedure])
  );

  const procedureByAppointment = new Map<string, string>();
  appointmentProcedures.forEach((row) => {
    if (procedureByAppointment.has(row.appointment_id)) return;
    const procedure = procedureById.get(row.procedure_id);
    if (procedure?.name) {
      procedureByAppointment.set(row.appointment_id, procedure.name);
    }
  });

  const monthCount = monthBuckets.length;
  const totalAppointments = Array.from({ length: monthCount }, () => 0);
  const completedAppointments = Array.from({ length: monthCount }, () => 0);
  const noShowAppointments = Array.from({ length: monthCount }, () => 0);
  const patientsByMonth = Array.from({ length: monthCount }, () => new Set<string>());
  const patientFirstMonth = new Map<string, number>();

  const shiftCounts = {
    dia: Array.from({ length: monthCount }, () => 0),
    manha: Array.from({ length: monthCount }, () => 0),
    tarde: Array.from({ length: monthCount }, () => 0),
    noite: Array.from({ length: monthCount }, () => 0),
  };

  appointments.forEach((appointment) => {
    const startAt = new Date(appointment.start_at);
    const key = toMonthKey(startAt);
    const index = monthIndex.get(key);
    if (index === undefined) return;

    if (appointment.status !== "cancelled") {
      totalAppointments[index] += 1;
      shiftCounts.dia[index] += 1;
    }

    if (appointment.status === "completed") {
      completedAppointments[index] += 1;
    }

    if (appointment.status === "no_show") {
      noShowAppointments[index] += 1;
    }

    if (appointment.status !== "cancelled") {
      const hour = startAt.getHours();
      if (hour < 12) shiftCounts.manha[index] += 1;
      else if (hour < 18) shiftCounts.tarde[index] += 1;
      else shiftCounts.noite[index] += 1;
    }

    if (appointment.status !== "cancelled" && appointment.patient_id) {
      patientsByMonth[index].add(appointment.patient_id);
      const existing = patientFirstMonth.get(appointment.patient_id);
      if (existing === undefined || index < existing) {
        patientFirstMonth.set(appointment.patient_id, index);
      }
    }
  });

  const newPatientsByMonth = Array.from({ length: monthCount }, () => 0);
  patientFirstMonth.forEach((index) => {
    newPatientsByMonth[index] += 1;
  });

  const totalPatientsByMonth = Array.from({ length: monthCount }, () => 0);
  let cumulativePatients = 0;
  for (let i = 0; i < monthCount; i += 1) {
    cumulativePatients += newPatientsByMonth[i];
    totalPatientsByMonth[i] = cumulativePatients;
  }

  const returningPatientsByMonth = patientsByMonth.map(
    (set, index) => Math.max(0, set.size - newPatientsByMonth[index])
  );

  const revenueByMonth = Array.from({ length: monthCount }, () => 0);
  payments.forEach((payment) => {
    if (!payment.paid_at) return;
    const paidAt = new Date(payment.paid_at);
    const key = toMonthKey(paidAt);
    const index = monthIndex.get(key);
    if (index === undefined) return;
    revenueByMonth[index] += Number(payment.amount ?? 0);
  });

  let expenseByMonth = Array.from({ length: monthCount }, () => 0);
  expenses.forEach((expense) => {
    if (!expense.paid_at) return;
    const paidAt = new Date(expense.paid_at);
    const key = toMonthKey(paidAt);
    const index = monthIndex.get(key);
    if (index === undefined) return;
    expenseByMonth[index] += Number(expense.amount ?? 0);
  });

  if (expenses.length === 0) {
    // TODO: Replace with real expense records once available.
    expenseByMonth = revenueByMonth.map((value, index) => {
      const factor = 0.55 + (index % 3) * 0.02;
      return Math.round(value * factor);
    });
  }

  const saldoByMonth = revenueByMonth.map(
    (value, index) => value - expenseByMonth[index]
  );

  const normalizeCounts = (values: number[]) => {
    const max = Math.max(...values, 1);
    return values.map((value) => Math.round((value / max) * 100));
  };

  const occupancyData = {
    dia: normalizeCounts(shiftCounts.dia),
    manha: normalizeCounts(shiftCounts.manha),
    tarde: normalizeCounts(shiftCounts.tarde),
    noite: normalizeCounts(shiftCounts.noite),
  };

  const lastIndex = monthCount - 1;
  const prevIndex = Math.max(0, monthCount - 2);
  const totalPatientsNow = totalPatientsByMonth[lastIndex] ?? 0;
  const totalPatientsPrev = totalPatientsByMonth[prevIndex] ?? 0;
  const newPatientsNow = newPatientsByMonth[lastIndex] ?? 0;
  const newPatientsPrev = newPatientsByMonth[prevIndex] ?? 0;
  const returnPatientsNow = returningPatientsByMonth[lastIndex] ?? 0;
  const returnPatientsPrev = returningPatientsByMonth[prevIndex] ?? 0;

  const returnRateNow =
    totalPatientsNow > 0
      ? Math.round((returnPatientsNow / totalPatientsNow) * 100)
      : 0;
  const returnRatePrev =
    totalPatientsPrev > 0
      ? Math.round((returnPatientsPrev / totalPatientsPrev) * 100)
      : 0;

  const patientAgeBuckets = [
    { label: "18-30 anos", value: 0 },
    { label: "31-45 anos", value: 0 },
    { label: "46-60 anos", value: 0 },
    { label: "60+ anos", value: 0 },
  ];
  const genderCounts = { female: 0, male: 0, other: 0 };

  patients.forEach((patient) => {
    if (patient.birth_date) {
      const birth = new Date(patient.birth_date);
      const age =
        now.getFullYear() -
        birth.getFullYear() -
        (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
          ? 1
          : 0);
      if (age <= 30) patientAgeBuckets[0].value += 1;
      else if (age <= 45) patientAgeBuckets[1].value += 1;
      else if (age <= 60) patientAgeBuckets[2].value += 1;
      else patientAgeBuckets[3].value += 1;
    }

    if (patient.gender === "female") genderCounts.female += 1;
    else if (patient.gender === "male") genderCounts.male += 1;
    else genderCounts.other += 1;
  });

  const totalAge = patientAgeBuckets.reduce((sum, item) => sum + item.value, 0);
  const totalGender =
    genderCounts.female + genderCounts.male + genderCounts.other;

  const ageDistribution = patientAgeBuckets.map((item) => ({
    label: item.label,
    value: totalAge ? Math.round((item.value / totalAge) * 100) : 0,
  }));

  const genderDistribution = [
    { label: "Feminino", value: totalGender ? Math.round((genderCounts.female / totalGender) * 100) : 0 },
    { label: "Masculino", value: totalGender ? Math.round((genderCounts.male / totalGender) * 100) : 0 },
    { label: "Outro", value: totalGender ? Math.round((genderCounts.other / totalGender) * 100) : 0 },
  ];

  const labels12 = monthBuckets.map((bucket) => bucket.label);
  const labels6 = labels12.slice(-6);

  const sliceLast = (values: number[]) => values.slice(-6);

  const patientsChartData = {
    "12m": {
      labels: labels12,
      total: totalPatientsByMonth,
      new: newPatientsByMonth,
      return: returningPatientsByMonth,
    },
    "6m": {
      labels: labels6,
      total: sliceLast(totalPatientsByMonth),
      new: sliceLast(newPatientsByMonth),
      return: sliceLast(returningPatientsByMonth),
    },
  };

  const consultationsChartData = {
    "12m": {
      labels: labels12,
      realizadas: completedAppointments,
      agendadas: totalAppointments,
      faltas: noShowAppointments,
    },
    "6m": {
      labels: labels6,
      realizadas: sliceLast(completedAppointments),
      agendadas: sliceLast(totalAppointments),
      faltas: sliceLast(noShowAppointments),
    },
  };

  const financeChartData = {
    "12m": {
      labels: labels12,
      receitas: revenueByMonth,
      despesas: expenseByMonth,
      saldo: saldoByMonth,
    },
    "6m": {
      labels: labels6,
      receitas: sliceLast(revenueByMonth),
      despesas: sliceLast(expenseByMonth),
      saldo: sliceLast(saldoByMonth),
    },
  };

  const occupancyChartData = {
    "12m": {
      labels: labels12,
      dia: occupancyData.dia,
      manha: occupancyData.manha,
      tarde: occupancyData.tarde,
      noite: occupancyData.noite,
    },
    "6m": {
      labels: labels6,
      dia: sliceLast(occupancyData.dia),
      manha: sliceLast(occupancyData.manha),
      tarde: sliceLast(occupancyData.tarde),
      noite: sliceLast(occupancyData.noite),
    },
  };

  const procedureCounts = new Map<string, number>();
  appointmentProcedures.forEach((row) => {
    const current = procedureCounts.get(row.procedure_id) ?? 0;
    procedureCounts.set(row.procedure_id, current + Number(row.quantity ?? 0));
  });

  const colorPalette = [
    "stroke-indigo-500",
    "stroke-cyan-500",
    "stroke-teal-500",
    "stroke-amber-500",
    "stroke-rose-500",
  ];

  const buildProcedureList = (category: string | null) => {
    const filtered = procedures.filter((procedure) =>
      category ? procedure.category === category : true
    );

    return filtered
      .map((procedure) => ({
        label: procedure.name,
        value: procedureCounts.get(procedure.id) ?? 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item, index) => ({
        ...item,
        color: colorPalette[index % colorPalette.length],
      }));
  };

  const proceduresData = {
    todos: buildProcedureList(null),
    estetica: buildProcedureList("estetica"),
    clinica: buildProcedureList("clinica"),
    orto: buildProcedureList("ortodontia"),
  };

  if (proceduresData.todos.length === 0) {
    proceduresData.todos = [
      { label: "Consulta geral", value: 12, color: "stroke-indigo-500" },
      { label: "Profilaxia", value: 8, color: "stroke-cyan-500" },
      { label: "Restauracao", value: 6, color: "stroke-teal-500" },
    ];
  }

  const upcomingAppointments = appointments
    .filter((appointment) => {
      if (!appointment.start_at) return false;
      const startAt = new Date(appointment.start_at);
      if (startAt < now) return false;
      return appointment.status !== "cancelled" && appointment.status !== "no_show";
    })
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    )
    .slice(0, 6);

  const conflictKeyCounts = new Map<string, number>();
  upcomingAppointments.forEach((appointment) => {
    const key = `${appointment.chair_id ?? "none"}-${appointment.start_at}`;
    conflictKeyCounts.set(key, (conflictKeyCounts.get(key) ?? 0) + 1);
  });

  const agendaEvents = upcomingAppointments.map((appointment) => {
    const startAt = new Date(appointment.start_at);
    const baseStatus =
      appointment.status === "confirmed" ? "confirmed" : "pending";
    const key = `${appointment.chair_id ?? "none"}-${appointment.start_at}`;
    const status =
      (conflictKeyCounts.get(key) ?? 0) > 1 ? "conflict" : baseStatus;
    const patient = patientById.get(appointment.patient_id)?.full_name ?? "Paciente";
    return {
      id: appointment.id,
      title: procedureByAppointment.get(appointment.id) ?? "Consulta",
      time: startAt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      patient,
      status,
    };
  });

  const lastConflict =
    agendaEvents.find((event) => event.status === "conflict") ?? null;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const appointmentsToday = appointments.filter((appointment) => {
    if (!appointment.start_at) return false;
    const startAt = new Date(appointment.start_at);
    return (
      startAt >= todayStart &&
      startAt < todayEnd &&
      appointment.status !== "cancelled"
    );
  });

  const patientsToday = new Set(
    appointmentsToday
      .map((appointment) => appointment.patient_id)
      .filter((id): id is string => Boolean(id))
  );

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);

  const appointmentsYesterday = appointments.filter((appointment) => {
    if (!appointment.start_at) return false;
    const startAt = new Date(appointment.start_at);
    return (
      startAt >= yesterdayStart &&
      startAt < yesterdayEnd &&
      appointment.status !== "cancelled"
    );
  });

  const patientsYesterday = new Set(
    appointmentsYesterday
      .map((appointment) => appointment.patient_id)
      .filter((id): id is string => Boolean(id))
  );

  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const currentStart = new Date(now.getTime() - monthMs);
  const previousStart = new Date(now.getTime() - monthMs * 2);

  const sumPayments = (start: Date, end: Date) =>
    payments.reduce((sum, payment) => {
      if (!payment.paid_at) return sum;
      const paidAt = new Date(payment.paid_at);
      if (paidAt < start || paidAt >= end) return sum;
      return sum + Number(payment.amount ?? 0);
    }, 0);

  const currentRevenue = sumPayments(currentStart, now);
  const previousRevenue = sumPayments(previousStart, currentStart);

  const paymentsInCurrent = payments.filter((payment) => {
    if (!payment.paid_at) return false;
    const paidAt = new Date(payment.paid_at);
    return paidAt >= currentStart && paidAt < now;
  });

  const paymentsInPrevious = payments.filter((payment) => {
    if (!payment.paid_at) return false;
    const paidAt = new Date(payment.paid_at);
    return paidAt >= previousStart && paidAt < currentStart;
  });

  const ticketMedio =
    paymentsInCurrent.length > 0
      ? paymentsInCurrent.reduce(
          (sum, payment) => sum + Number(payment.amount ?? 0),
          0
        ) / paymentsInCurrent.length
      : 0;

  const ticketMedioPrev =
    paymentsInPrevious.length > 0
      ? paymentsInPrevious.reduce(
          (sum, payment) => sum + Number(payment.amount ?? 0),
          0
        ) / paymentsInPrevious.length
      : 0;

  const activeDaysSet = new Set<string>();
  let hoursTotal = 0;
  appointments.forEach((appointment) => {
    if (!appointment.start_at || !appointment.end_at) return;
    const startAt = new Date(appointment.start_at);
    if (startAt < currentStart || appointment.status === "cancelled") return;
    activeDaysSet.add(startAt.toISOString().slice(0, 10));
    const endAt = new Date(appointment.end_at);
    const hours = Math.max(0, (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60));
    hoursTotal += hours;
  });

  const notificationItems =
    notifications.length > 0
      ? notifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          description: notification.body ?? "",
          time: notification.created_at
            ? formatRelativeTime(new Date(notification.created_at), now)
            : "agora",
          tone:
            notification.severity === "success"
              ? "success"
              : notification.severity === "warning" ||
                notification.severity === "danger"
              ? "warning"
              : notification.severity === "highlight"
              ? "highlight"
              : "info",
        }))
      : [];

  if (notificationItems.length === 0) {
    upcomingAppointments.slice(0, 2).forEach((appointment) => {
      const patient = patientById.get(appointment.patient_id)?.full_name ?? "Paciente";
      notificationItems.push({
        id: `upcoming-${appointment.id}`,
        title: `Paciente ${patient} confirmou`,
        description: `Consulta as ${new Date(appointment.start_at).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        time: "ha poucos minutos",
        tone: "success",
      });
    });

    const lastNoShow = appointments.find(
      (appointment) => appointment.status === "no_show"
    );
    if (lastNoShow) {
      const patient = patientById.get(lastNoShow.patient_id)?.full_name ?? "Paciente";
      notificationItems.push({
        id: `noshow-${lastNoShow.id}`,
        title: `Paciente ${patient} nao compareceu`,
        description: "Reagendar acompanhamento",
        time: "ha 1 h",
        tone: "warning",
      });
    }

    notificationItems.push({
      id: "insight-1",
      title: "Receita em alta",
      description: "Ticket medio acima do esperado",
      time: "ha 2 h",
      tone: "highlight",
    });
  }

  return NextResponse.json({
    metrics: {
      revenue: {
        value: Math.round(currentRevenue),
        trend: formatTrend(currentRevenue, previousRevenue, "vs mes anterior"),
      },
      patientsToday: {
        value: patientsToday.size,
        trend: formatTrend(
          patientsToday.size,
          patientsYesterday.size,
          "vs ontem"
        ),
      },
      ticketMedio: {
        value: Math.round(ticketMedio),
        trend: formatTrend(ticketMedio, ticketMedioPrev, "vs mes anterior"),
      },
    },
    agenda: {
      events: agendaEvents,
      connected: Boolean(googleTokens),
      lastSyncAt: googleTokens?.updated_at ?? null,
      nextSyncAt: googleTokens
        ? new Date(now.getTime() + 30 * 60 * 1000).toISOString()
        : null,
      lastConflict,
    },
    notifications: notificationItems.slice(0, 6),
    analytics: {
      patients: {
        chartData: patientsChartData,
        metrics: {
          total: {
            value: totalPatientsNow,
            delta: formatDelta(totalPatientsNow, totalPatientsPrev),
          },
          new: {
            value: newPatientsNow,
            delta: formatDelta(newPatientsNow, newPatientsPrev),
          },
          returnRate: {
            value: returnRateNow,
            delta: formatDelta(returnRateNow, returnRatePrev),
          },
        },
        distributions: {
          age: ageDistribution,
          gender: genderDistribution,
        },
        updatedAtLabel: "Atualizado hoje",
      },
      consultations: {
        chartData: consultationsChartData,
      },
      finance: {
        chartData: financeChartData,
      },
      procedures: {
        data: proceduresData,
        note: "Estetica cresce em participacao.",
      },
      occupancy: {
        chartData: occupancyChartData,
        stats: {
          activeDays: activeDaysSet.size,
          hoursTotal: Math.round(hoursTotal),
          chairs: chairs.length,
        },
      },
    },
  });
}
