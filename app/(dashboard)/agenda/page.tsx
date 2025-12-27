
"use client";

import * as React from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { SegmentedControl } from "../../../components/ui/segmented-control";
import { useActiveClinic } from "../../../hooks/useActiveClinic";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { supabase } from "../../../lib/supabase/client";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

type CheckinStatus = "waiting" | "arrived" | "in_chair" | "completed";
type WaitStatus = "open" | "contacted" | "scheduled" | "closed";

type AppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  notes: string | null;
  patient_id: string;
  chair_id: string | null;
  patient: { id: string; full_name: string } | null;
  chair: { id: string; name: string } | null;
};

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes: string | null;
  patientId: string;
  chairId: string | null;
  patientName: string;
  chairName: string | null;
};

type AppointmentBlock = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  reason: string | null;
};

type AppointmentCheckin = {
  appointmentId: string;
  status: CheckinStatus;
  arrivedAt: string | null;
  chairAt: string | null;
  completedAt: string | null;
};

type WaitingItem = {
  id: string;
  patientId: string | null;
  fullName: string | null;
  contactPhone: string | null;
  notes: string | null;
  preferredDate: string | null;
  status: WaitStatus;
};

type PatientOption = { id: string; full_name: string };
type ChairOption = { id: string; name: string };

type ViewMode = "list" | "week";

const statusOptions: { value: AppointmentStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "scheduled", label: "Agendado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Concluido" },
  { value: "cancelled", label: "Cancelado" },
  { value: "no_show", label: "Falta" },
];

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluido",
  cancelled: "Cancelado",
  no_show: "Falta",
};

const statusVariants: Record<
  AppointmentStatus,
  "info" | "success" | "warning" | "danger" | "default"
> = {
  scheduled: "info",
  confirmed: "success",
  completed: "default",
  cancelled: "danger",
  no_show: "warning",
};

const checkinLabels: Record<CheckinStatus, string> = {
  waiting: "Aguardando",
  arrived: "Chegou",
  in_chair: "Na cadeira",
  completed: "Finalizado",
};

const checkinVariants: Record<
  CheckinStatus,
  "info" | "success" | "warning" | "default"
> = {
  waiting: "info",
  arrived: "success",
  in_chair: "warning",
  completed: "default",
};

const waitStatusLabels: Record<WaitStatus, string> = {
  open: "Aberto",
  contacted: "Contato",
  scheduled: "Agendado",
  closed: "Fechado",
};

const waitStatusVariants: Record<
  WaitStatus,
  "info" | "success" | "warning" | "default"
> = {
  open: "info",
  contacted: "warning",
  scheduled: "success",
  closed: "default",
};

const inputClass =
  "w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40";

const pad = (value: number) => value.toString().padStart(2, "0");

const toDateInput = (value: Date) =>
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}`;

const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const toIsoFromLocal = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const addDays = (value: Date, days: number) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);

const startOfWeek = (value: Date) => {
  const date = new Date(value);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatHour = (value: string) =>
  new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDay = (value: Date) =>
  value.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const overlap = (startA: Date, endA: Date, startB: Date, endB: Date) =>
  startA < endB && endA > startB;

export default function AgendaPage() {
  const { activeClinic } = useActiveClinic();
  const { user } = useAuthSession();
  const clinicId = activeClinic?.id;
  const searchParams = useSearchParams();
  const patientParam = searchParams.get("patientId");

  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [blocks, setBlocks] = React.useState<AppointmentBlock[]>([]);
  const [checkins, setCheckins] = React.useState<AppointmentCheckin[]>([]);
  const [waitingList, setWaitingList] = React.useState<WaitingItem[]>([]);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [chairs, setChairs] = React.useState<ChairOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const today = React.useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [weekStart, setWeekStart] = React.useState<Date>(() =>
    startOfWeek(today)
  );
  const [fromDate, setFromDate] = React.useState(() => toDateInput(today));
  const [toDate, setToDate] = React.useState(() =>
    toDateInput(addDays(today, 14))
  );
  const [statusFilter, setStatusFilter] = React.useState<
    AppointmentStatus | "all"
  >("all");
  const [chairFilter, setChairFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [patientId, setPatientId] = React.useState("");
  const [chairId, setChairId] = React.useState("");
  const [startAt, setStartAt] = React.useState(() =>
    toLocalDateTimeInput(new Date().toISOString())
  );
  const [endAt, setEndAt] = React.useState(() =>
    toLocalDateTimeInput(addDays(new Date(), 0).toISOString())
  );
  const [status, setStatus] = React.useState<AppointmentStatus>("scheduled");
  const [notes, setNotes] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const [quickPatientId, setQuickPatientId] = React.useState("");
  const [quickChairId, setQuickChairId] = React.useState("");
  const [quickDate, setQuickDate] = React.useState(() => toDateInput(today));
  const [quickTime, setQuickTime] = React.useState("09:00");
  const [quickDuration, setQuickDuration] = React.useState("60");
  const [quickNotes, setQuickNotes] = React.useState("");

  const [blockTitle, setBlockTitle] = React.useState("");
  const [blockStart, setBlockStart] = React.useState(() =>
    toLocalDateTimeInput(new Date().toISOString())
  );
  const [blockEnd, setBlockEnd] = React.useState(() =>
    toLocalDateTimeInput(addDays(new Date(), 0).toISOString())
  );
  const [blockReason, setBlockReason] = React.useState("");

  const [waitingPatientId, setWaitingPatientId] = React.useState("");
  const [waitingName, setWaitingName] = React.useState("");
  const [waitingPhone, setWaitingPhone] = React.useState("");
  const [waitingNotes, setWaitingNotes] = React.useState("");
  const [waitingDate, setWaitingDate] = React.useState(() =>
    toDateInput(addDays(today, 7))
  );

  const [nowTick, setNowTick] = React.useState(Date.now());

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTick(Date.now());
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (viewMode !== "week") return;
    const start = weekStart;
    const end = addDays(start, 6);
    setFromDate(toDateInput(start));
    setToDate(toDateInput(end));
  }, [viewMode, weekStart]);

  const loadLookups = React.useCallback(async () => {
    if (!clinicId) {
      setPatients([]);
      setChairs([]);
      return;
    }

    const [patientsRes, chairsRes] = await Promise.all([
      supabase
        .from("patients")
        .select("id, full_name")
        .eq("clinic_id", clinicId)
        .order("full_name", { ascending: true }),
      supabase
        .from("chairs")
        .select("id, name")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true }),
    ]);

    setPatients(patientsRes.data ?? []);
    setChairs(chairsRes.data ?? []);
  }, [clinicId]);

  const loadAgenda = React.useCallback(async () => {
    if (!clinicId) {
      setAppointments([]);
      setBlocks([]);
      setCheckins([]);
      setWaitingList([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    let appointmentQuery = supabase
      .from("appointments")
      .select(
        "id, start_at, end_at, status, notes, patient_id, chair_id, patient:patients(id, full_name), chair:chairs(id, name)"
      )
      .eq("clinic_id", clinicId)
      .order("start_at", { ascending: true });

    if (statusFilter !== "all") {
      appointmentQuery = appointmentQuery.eq("status", statusFilter);
    }
    if (fromDate) {
      appointmentQuery = appointmentQuery.gte("start_at", `${fromDate}T00:00:00`);
    }
    if (toDate) {
      appointmentQuery = appointmentQuery.lte("start_at", `${toDate}T23:59:59`);
    }

    const [appointmentsRes, blocksRes, checkinsRes, waitingRes] =
      await Promise.all([
        appointmentQuery,
        supabase
          .from("appointment_blocks")
          .select("id, title, start_at, end_at, reason")
          .eq("clinic_id", clinicId)
          .order("start_at", { ascending: true }),
        supabase
          .from("appointment_checkins")
          .select("appointment_id, status, arrived_at, chair_at, completed_at")
          .eq("clinic_id", clinicId),
        supabase
          .from("waiting_list")
          .select(
            "id, patient_id, full_name, contact_phone, notes, preferred_date, status"
          )
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false })
          .limit(40),
      ]);

    if (
      appointmentsRes.error ||
      blocksRes.error ||
      checkinsRes.error ||
      waitingRes.error
    ) {
      setError("Falha ao carregar agenda.");
      setIsLoading(false);
      return;
    }

    const mappedAppointments =
      (appointmentsRes.data as AppointmentRow[] | null)?.map((row) => ({
        id: row.id,
        startAt: row.start_at,
        endAt: row.end_at,
        status: row.status,
        notes: row.notes,
        patientId: row.patient_id,
        chairId: row.chair_id,
        patientName: row.patient?.full_name ?? "Paciente",
        chairName: row.chair?.name ?? null,
      })) ?? [];

    setAppointments(mappedAppointments);
    setBlocks(
      (blocksRes.data ?? []).map((block) => ({
        id: block.id,
        title: block.title,
        startAt: block.start_at,
        endAt: block.end_at,
        reason: block.reason,
      }))
    );
    setCheckins(
      (checkinsRes.data ?? []).map((checkin) => ({
        appointmentId: checkin.appointment_id,
        status: checkin.status as CheckinStatus,
        arrivedAt: checkin.arrived_at,
        chairAt: checkin.chair_at,
        completedAt: checkin.completed_at,
      }))
    );
    setWaitingList(
      (waitingRes.data ?? []).map((item) => ({
        id: item.id,
        patientId: item.patient_id,
        fullName: item.full_name,
        contactPhone: item.contact_phone,
        notes: item.notes,
        preferredDate: item.preferred_date,
        status: item.status as WaitStatus,
      }))
    );
    setIsLoading(false);
  }, [clinicId, fromDate, statusFilter, toDate]);

  React.useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  React.useEffect(() => {
    void loadAgenda();
  }, [loadAgenda]);

  React.useEffect(() => {
    if (!patientId && patients.length > 0) {
      setPatientId(patients[0].id);
    }
    if (!quickPatientId && patients.length > 0) {
      setQuickPatientId(patients[0].id);
    }
  }, [patientId, patients, quickPatientId]);

  React.useEffect(() => {
    if (!patientParam) return;
    setQuickPatientId(patientParam);
    setPatientId(patientParam);
  }, [patientParam]);

  React.useEffect(() => {
    if (!startAt) return;
    const parsed = new Date(startAt);
    if (Number.isNaN(parsed.getTime())) return;
    const end = new Date(parsed.getTime() + 60 * 60 * 1000);
    if (!endAt || new Date(endAt) <= parsed) {
      setEndAt(toLocalDateTimeInput(end.toISOString()));
    }
  }, [endAt, startAt]);

  const checkinsByAppointment = React.useMemo(() => {
    const map = new Map<string, AppointmentCheckin>();
    checkins.forEach((checkin) => map.set(checkin.appointmentId, checkin));
    return map;
  }, [checkins]);

  const conflictIds = React.useMemo(() => {
    const conflicts = new Set<string>();
    const appointmentList = appointments;
    for (let i = 0; i < appointmentList.length; i += 1) {
      const current = appointmentList[i];
      const start = new Date(current.startAt);
      const end = new Date(current.endAt);
      for (let j = 0; j < appointmentList.length; j += 1) {
        if (i === j) continue;
        const other = appointmentList[j];
        if (!current.chairId || current.chairId !== other.chairId) continue;
        if (
          overlap(
            start,
            end,
            new Date(other.startAt),
            new Date(other.endAt)
          )
        ) {
          conflicts.add(current.id);
          break;
        }
      }
      if (!conflicts.has(current.id)) {
        const blockConflict = blocks.some((block) =>
          overlap(start, end, new Date(block.startAt), new Date(block.endAt))
        );
        if (blockConflict) conflicts.add(current.id);
      }
    }
    return conflicts;
  }, [appointments, blocks]);

  const filteredAppointments = appointments.filter((appointment) => {
    if (chairFilter !== "all" && appointment.chairId !== chairFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      appointment.patientName.toLowerCase().includes(term) ||
      appointment.notes?.toLowerCase().includes(term) ||
      appointment.chairName?.toLowerCase().includes(term)
    );
  });

  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) =>
      addDays(weekStart, index)
    );
  }, [weekStart]);

  const dayAppointments = React.useCallback(
    (date: Date) => {
      return filteredAppointments.filter((appointment) => {
        const start = new Date(appointment.startAt);
        return (
          start.getFullYear() === date.getFullYear() &&
          start.getMonth() === date.getMonth() &&
          start.getDate() === date.getDate()
        );
      });
    },
    [filteredAppointments]
  );

  const dayBlocks = React.useCallback(
    (date: Date) => {
      return blocks.filter((block) => {
        const start = new Date(block.startAt);
        return (
          start.getFullYear() === date.getFullYear() &&
          start.getMonth() === date.getMonth() &&
          start.getDate() === date.getDate()
        );
      });
    },
    [blocks]
  );

  const resetForm = () => {
    setEditingId(null);
    setNotes("");
    setStatus("scheduled");
    setStartAt(toLocalDateTimeInput(new Date().toISOString()));
    setEndAt(toLocalDateTimeInput(addDays(new Date(), 0).toISOString()));
    if (patients[0]) setPatientId(patients[0].id);
    setChairId("");
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setPatientId(appointment.patientId);
    setChairId(appointment.chairId ?? "");
    setStatus(appointment.status);
    setNotes(appointment.notes ?? "");
    setStartAt(toLocalDateTimeInput(appointment.startAt));
    setEndAt(toLocalDateTimeInput(appointment.endAt));
  };

  const checkConflicts = React.useCallback(
    (startIso: string, endIso: string, targetChairId?: string | null) => {
      const conflicts: string[] = [];
      const start = new Date(startIso);
      const end = new Date(endIso);

      if (targetChairId) {
        const chairConflict = appointments.find((appointment) => {
          if (editingId && appointment.id === editingId) return false;
          if (appointment.chairId !== targetChairId) return false;
          return overlap(start, end, new Date(appointment.startAt), new Date(appointment.endAt));
        });
        if (chairConflict) {
          conflicts.push("Conflito de cadeira com outra consulta.");
        }
      }

      const patientConflict = appointments.find((appointment) => {
        if (editingId && appointment.id === editingId) return false;
        if (appointment.patientId !== patientId) return false;
        return overlap(start, end, new Date(appointment.startAt), new Date(appointment.endAt));
      });
      if (patientConflict) {
        conflicts.push("Paciente com horario duplicado.");
      }

      const blockConflict = blocks.find((block) =>
        overlap(start, end, new Date(block.startAt), new Date(block.endAt))
      );
      if (blockConflict) {
        conflicts.push(`Bloqueio ativo: ${blockConflict.title}.`);
      }

      return conflicts;
    },
    [appointments, blocks, editingId, patientId]
  );

  const handleSave = async () => {
    if (!clinicId || !patientId) return;
    const startIso = toIsoFromLocal(startAt);
    const endIso = toIsoFromLocal(endAt);
    if (!startIso || !endIso) {
      setError("Informe data e horario validos.");
      return;
    }
    if (new Date(endIso) <= new Date(startIso)) {
      setError("O horario final precisa ser maior que o inicio.");
      return;
    }

    const conflicts = checkConflicts(startIso, endIso, chairId || null);
    if (conflicts.length) {
      setError(conflicts[0]);
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      clinic_id: clinicId,
      patient_id: patientId,
      chair_id: chairId || null,
      start_at: startIso,
      end_at: endIso,
      status,
      notes: notes || null,
      created_by: user?.id ?? null,
    };

    const { error: saveError } = editingId
      ? await supabase.from("appointments").update(payload).eq("id", editingId)
      : await supabase.from("appointments").insert(payload);

    if (saveError) {
      setError("Nao foi possivel salvar a consulta.");
      setIsSaving(false);
      return;
    }

    await loadAgenda();
    resetForm();
    setIsSaving(false);
  };

  const handleQuickCreate = async () => {
    if (!clinicId || !quickPatientId) return;
    const startIso = toIsoFromLocal(`${quickDate}T${quickTime}`);
    if (!startIso) return;
    const durationMinutes = Number(quickDuration) || 60;
    const endIso = new Date(
      new Date(startIso).getTime() + durationMinutes * 60000
    ).toISOString();

    const conflicts = checkConflicts(startIso, endIso, quickChairId || null);
    if (conflicts.length) {
      setError(conflicts[0]);
      return;
    }

    setIsSaving(true);
    const { error: insertError } = await supabase.from("appointments").insert({
      clinic_id: clinicId,
      patient_id: quickPatientId,
      chair_id: quickChairId || null,
      start_at: startIso,
      end_at: endIso,
      status: "scheduled",
      notes: quickNotes || null,
      created_by: user?.id ?? null,
    });

    if (insertError) {
      setError("Nao foi possivel criar a consulta.");
      setIsSaving(false);
      return;
    }

    setQuickNotes("");
    await loadAgenda();
    setIsSaving(false);
  };

  const handleDelete = async (appointmentId: string) => {
    if (!clinicId) return;
    if (!window.confirm("Deseja remover esta consulta?")) return;
    setIsSaving(true);
    const { error: deleteError } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointmentId);

    if (deleteError) {
      setError("Nao foi possivel remover a consulta.");
      setIsSaving(false);
      return;
    }

    await loadAgenda();
    setIsSaving(false);
  };

  const handleReschedule = async (appointmentId: string, day: Date) => {
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    const startDate = new Date(appointment.startAt);
    const endDate = new Date(appointment.endAt);
    const duration = endDate.getTime() - startDate.getTime();

    const newStart = new Date(day);
    newStart.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    const conflicts = checkConflicts(
      newStart.toISOString(),
      newEnd.toISOString(),
      appointment.chairId
    );
    if (conflicts.length) {
      setError(conflicts[0]);
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        start_at: newStart.toISOString(),
        end_at: newEnd.toISOString(),
      })
      .eq("id", appointmentId);

    if (updateError) {
      setError("Nao foi possivel reagendar.");
      setIsSaving(false);
      return;
    }

    await loadAgenda();
    setIsSaving(false);
  };

  const handleCheckinUpdate = async (
    appointmentId: string,
    nextStatus: CheckinStatus
  ) => {
    if (!clinicId) return;
    const now = new Date().toISOString();
    const payload: Record<string, string | null> = {
      status: nextStatus,
      updated_at: now,
    };

    if (nextStatus === "arrived") payload.arrived_at = now;
    if (nextStatus === "in_chair") payload.chair_at = now;
    if (nextStatus === "completed") payload.completed_at = now;

    await supabase.from("appointment_checkins").upsert(
      {
        clinic_id: clinicId,
        appointment_id: appointmentId,
        status: nextStatus,
        arrived_at: payload.arrived_at ?? null,
        chair_at: payload.chair_at ?? null,
        completed_at: payload.completed_at ?? null,
        created_by: user?.id ?? null,
      },
      { onConflict: "appointment_id" }
    );

    if (nextStatus === "completed") {
      await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", appointmentId);
    }

    await loadAgenda();
  };

  const handleCreateBlock = async () => {
    if (!clinicId || !blockTitle.trim()) return;
    const startIso = toIsoFromLocal(blockStart);
    const endIso = toIsoFromLocal(blockEnd);
    if (!startIso || !endIso) return;

    const { error: blockError } = await supabase
      .from("appointment_blocks")
      .insert({
        clinic_id: clinicId,
        title: blockTitle.trim(),
        start_at: startIso,
        end_at: endIso,
        reason: blockReason.trim() || null,
        created_by: user?.id ?? null,
      });

    if (blockError) {
      setError("Nao foi possivel salvar bloqueio.");
      return;
    }

    setBlockTitle("");
    setBlockReason("");
    await loadAgenda();
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!clinicId) return;
    await supabase.from("appointment_blocks").delete().eq("id", blockId);
    await loadAgenda();
  };

  const handleCreateWaiting = async () => {
    if (!clinicId || (!waitingPatientId && !waitingName.trim())) return;

    const { error: waitingError } = await supabase
      .from("waiting_list")
      .insert({
        clinic_id: clinicId,
        patient_id: waitingPatientId || null,
        full_name: waitingPatientId ? null : waitingName.trim(),
        contact_phone: waitingPhone.trim() || null,
        notes: waitingNotes.trim() || null,
        preferred_date: waitingDate || null,
        status: "open",
        created_by: user?.id ?? null,
      });

    if (waitingError) {
      setError("Nao foi possivel salvar fila de espera.");
      return;
    }

    setWaitingName("");
    setWaitingPhone("");
    setWaitingNotes("");
    await loadAgenda();
  };

  const handleUpdateWaitingStatus = async (
    itemId: string,
    nextStatus: WaitStatus
  ) => {
    await supabase
      .from("waiting_list")
      .update({ status: nextStatus })
      .eq("id", itemId);
    await loadAgenda();
  };

  const handleWaitingToAppointment = (item: WaitingItem) => {
    if (item.patientId) {
      setQuickPatientId(item.patientId);
    }
    if (item.preferredDate) {
      setQuickDate(item.preferredDate);
    }
    if (item.notes) {
      setQuickNotes(item.notes);
    }
    setWaitingName("");
    setWaitingPhone("");
    setWaitingNotes("");
  };

  const waitingMinutes = (checkin?: AppointmentCheckin | null) => {
    if (!checkin?.arrivedAt) return null;
    const diff = Math.max(
      0,
      Math.round((nowTick - new Date(checkin.arrivedAt).getTime()) / 60000)
    );
    return diff;
  };

  const viewOptions = [
    { id: "list", label: "Lista" },
    { id: "week", label: "Semana" },
  ];

  const todayAppointments = React.useMemo(() => {
    return appointments.filter((appointment) =>
      isSameDay(new Date(appointment.startAt), today)
    );
  }, [appointments, today]);

  const todayConfirmed = React.useMemo(() => {
    return todayAppointments.filter((appointment) =>
      ["confirmed", "completed"].includes(appointment.status)
    ).length;
  }, [todayAppointments]);

  const todayConflicts = React.useMemo(() => {
    return todayAppointments.filter((appointment) =>
      conflictIds.has(appointment.id)
    ).length;
  }, [conflictIds, todayAppointments]);

  const waitingOpen = React.useMemo(() => {
    return waitingList.filter((item) => item.status === "open").length;
  }, [waitingList]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Agenda
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Consultas e horarios
          </h1>
          <p className="text-sm text-slate-500">
            Check-in, conflitos e bloqueios inteligentes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            options={viewOptions}
            value={viewMode}
            onValueChange={(value) => setViewMode(value as ViewMode)}
          />
          <Button variant="secondary" onClick={loadAgenda}>
            Atualizar
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Card className="md:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-slate-500">Buscar paciente</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={inputClass}
                placeholder="Nome ou observacao"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Status</label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as AppointmentStatus | "all"
                  )
                }
                className={inputClass}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Cadeira</label>
              <select
                value={chairFilter}
                onChange={(event) => setChairFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">Todas</option>
                {chairs.map((chair) => (
                  <option key={chair.id} value={chair.id}>
                    {chair.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
        <Card>
          <label className="text-xs text-slate-500">De</label>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className={inputClass}
          />
        </Card>
        <Card>
          <label className="text-xs text-slate-500">Ate</label>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className={inputClass}
          />
        </Card>
      </section>

      {error ? (
        <Card className="border-rose-200 bg-rose-50/70 text-sm text-rose-700">
          {error}
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Consultas hoje</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {todayAppointments.length}
          </p>
          <p className="text-xs text-slate-500">
            Confirmadas: {todayConfirmed}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Conflitos ativos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {conflictIds.size}
          </p>
          <p className="text-xs text-slate-500">
            Hoje: {todayConflicts}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Fila de espera</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {waitingList.length}
          </p>
          <p className="text-xs text-slate-500">Abertas: {waitingOpen}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Check-ins pendentes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {checkins.filter((checkin) => checkin.status !== "completed").length}
          </p>
          <p className="text-xs text-slate-500">
            Aguardando:{" "}
            {checkins.filter((checkin) => checkin.status === "waiting").length}
          </p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Calendario da semana
                </p>
                <p className="text-xs text-slate-500">
                  Arraste para reagendar. Clique para editar.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600">
                  {toDateInput(weekStart)} - {toDateInput(addDays(weekStart, 6))}
                </span>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-7">
              {weekDays.map((day) => {
                const items = dayAppointments(day);
                const dayBlockItems = dayBlocks(day);
                return (
                  <div
                    key={day.toISOString()}
                    className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm shadow-indigo-500/10"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const id = event.dataTransfer.getData("text/plain");
                      if (id) void handleReschedule(id, day);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        {formatDay(day)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setQuickDate(toDateInput(day));
                          setViewMode("week");
                        }}
                      >
                        <CalendarPlus className="h-4 w-4" />
                      </Button>
                    </div>

                    {dayBlockItems.map((block) => (
                      <div
                        key={block.id}
                        className="rounded-xl border border-amber-200/70 bg-amber-50/70 px-2 py-1 text-xs text-amber-800"
                      >
                        <p className="font-semibold">{block.title}</p>
                        <p className="text-[11px] text-amber-700">
                          {formatHour(block.startAt)} - {formatHour(block.endAt)}
                        </p>
                      </div>
                    ))}

                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200/70 px-2 py-3 text-xs text-slate-400">
                        Sem consultas
                      </div>
                    ) : (
                      items.map((appointment) => (
                        <div
                          key={appointment.id}
                          draggable
                          onDragStart={(event) =>
                            event.dataTransfer.setData(
                              "text/plain",
                              appointment.id
                            )
                          }
                          className="cursor-grab rounded-xl border border-white/60 bg-white/80 px-2 py-2 text-xs text-slate-700 shadow-sm"
                          onClick={() => handleEdit(appointment)}
                        >
                          <p className="font-semibold text-slate-900">
                            {appointment.patientName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatHour(appointment.startAt)} - {formatHour(appointment.endAt)}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <Badge variant={statusVariants[appointment.status]}>
                              {statusLabels[appointment.status]}
                            </Badge>
                            {conflictIds.has(appointment.id) ? (
                              <span className="flex items-center gap-1 text-[10px] text-rose-600">
                                <ShieldAlert className="h-3 w-3" />
                                Conflito
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Consultas no periodo
                </p>
                <p className="text-xs text-slate-500">
                  {filteredAppointments.length} agendamentos
                </p>
              </div>
              <Badge variant="info">{filteredAppointments.length}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {isLoading ? (
                <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-5 text-sm text-slate-500">
                  Carregando agenda...
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-5 text-sm text-slate-500">
                  Nenhuma consulta no periodo selecionado.
                </div>
              ) : (
                filteredAppointments.map((appointment) => {
                  const checkin = checkinsByAppointment.get(appointment.id);
                  const waitTime = waitingMinutes(checkin);
                  return (
                    <div
                      key={appointment.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm shadow-sm shadow-indigo-500/10"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {appointment.patientName}
                          </p>
                          <Badge variant={statusVariants[appointment.status]}>
                            {statusLabels[appointment.status]}
                          </Badge>
                          {conflictIds.has(appointment.id) ? (
                            <Badge variant="danger">Conflito</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500">
                          {formatHour(appointment.startAt)} - {formatHour(appointment.endAt)}
                          {appointment.chairName
                            ? ` - ${appointment.chairName}`
                            : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <Badge
                            variant={
                              checkin ? checkinVariants[checkin.status] : "info"
                            }
                          >
                            {checkin
                              ? checkinLabels[checkin.status]
                              : checkinLabels.waiting}
                          </Badge>
                          {waitTime !== null ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {waitTime} min
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(appointment)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(appointment.id)}
                        >
                          Excluir
                        </Button>
                        <div className="flex flex-wrap gap-2">
                          {checkin?.status !== "arrived" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                handleCheckinUpdate(appointment.id, "arrived")
                              }
                            >
                              Chegou
                            </Button>
                          ) : null}
                          {checkin?.status !== "in_chair" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                handleCheckinUpdate(appointment.id, "in_chair")
                              }
                            >
                              Na cadeira
                            </Button>
                          ) : null}
                          {checkin?.status !== "completed" ? (
                            <Button
                              variant="glow"
                              size="sm"
                              onClick={() =>
                                handleCheckinUpdate(
                                  appointment.id,
                                  "completed"
                                )
                              }
                            >
                              Finalizar
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Agendar rapido
                </p>
                <p className="text-xs text-slate-500">
                  Crie consultas em segundos.
                </p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <CalendarPlus className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Paciente</label>
                <select
                  value={quickPatientId}
                  onChange={(event) => setQuickPatientId(event.target.value)}
                  className={inputClass}
                >
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Cadeira</label>
                <select
                  value={quickChairId}
                  onChange={(event) => setQuickChairId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Sem cadeira</option>
                  {chairs.map((chair) => (
                    <option key={chair.id} value={chair.id}>
                      {chair.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Data</label>
                  <input
                    type="date"
                    value={quickDate}
                    onChange={(event) => setQuickDate(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Horario</label>
                  <input
                    type="time"
                    value={quickTime}
                    onChange={(event) => setQuickTime(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Duracao</label>
                  <select
                    value={quickDuration}
                    onChange={(event) => setQuickDuration(event.target.value)}
                    className={inputClass}
                  >
                    <option value="30">30 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Notas</label>
                  <input
                    value={quickNotes}
                    onChange={(event) => setQuickNotes(event.target.value)}
                    className={inputClass}
                    placeholder="Preferencias"
                  />
                </div>
              </div>
              <Button
                variant="glow"
                className="w-full"
                onClick={handleQuickCreate}
                disabled={isSaving}
              >
                Agendar consulta
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Detalhes da consulta
                </p>
                <p className="text-xs text-slate-500">
                  Atualize horarios e status.
                </p>
              </div>
              <Badge variant="default">{editingId ? "Edicao" : "Novo"}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Paciente</label>
                <select
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  className={inputClass}
                >
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-500">Cadeira</label>
                <select
                  value={chairId}
                  onChange={(event) => setChairId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Sem cadeira</option>
                  {chairs.map((chair) => (
                    <option key={chair.id} value={chair.id}>
                      {chair.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Inicio</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Fim</label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(event) => setEndAt(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-500">Status</label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as AppointmentStatus)
                  }
                  className={inputClass}
                >
                  {statusOptions
                    .filter((option) => option.value !== "all")
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-500">Observacoes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Informacoes adicionais para a equipe clinica"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="glow"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  Salvar consulta
                </Button>
                {editingId ? (
                  <Button variant="ghost" onClick={resetForm}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Bloqueios de horario
                </p>
                <p className="text-xs text-slate-500">
                  Evite conflitos na agenda.
                </p>
              </div>
              <Badge variant="info">{blocks.length}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Titulo</label>
                <input
                  value={blockTitle}
                  onChange={(event) => setBlockTitle(event.target.value)}
                  className={inputClass}
                  placeholder="Ex: Treinamento"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Inicio</label>
                  <input
                    type="datetime-local"
                    value={blockStart}
                    onChange={(event) => setBlockStart(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Fim</label>
                  <input
                    type="datetime-local"
                    value={blockEnd}
                    onChange={(event) => setBlockEnd(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Motivo</label>
                <input
                  value={blockReason}
                  onChange={(event) => setBlockReason(event.target.value)}
                  className={inputClass}
                  placeholder="Motivo do bloqueio"
                />
              </div>
              <Button variant="secondary" onClick={handleCreateBlock}>
                Criar bloqueio
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {blocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-5 text-sm text-slate-500">
                  Nenhum bloqueio ativo.
                </div>
              ) : (
                blocks.slice(0, 5).map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-xs text-slate-600"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {block.title}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatHour(block.startAt)} - {formatHour(block.endAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      Remover
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Fila de espera
                </p>
                <p className="text-xs text-slate-500">
                  Convertendo interesse em consultas.
                </p>
              </div>
              <Badge variant="info">{waitingList.length}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Paciente</label>
                <select
                  value={waitingPatientId}
                  onChange={(event) => setWaitingPatientId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Novo paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name}
                    </option>
                  ))}
                </select>
              </div>
              {!waitingPatientId ? (
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Nome</label>
                  <input
                    value={waitingName}
                    onChange={(event) => setWaitingName(event.target.value)}
                    className={inputClass}
                    placeholder="Nome do paciente"
                  />
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Telefone</label>
                  <input
                    value={waitingPhone}
                    onChange={(event) => setWaitingPhone(event.target.value)}
                    className={inputClass}
                    placeholder="Contato"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Data ideal</label>
                  <input
                    type="date"
                    value={waitingDate}
                    onChange={(event) => setWaitingDate(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Notas</label>
                <input
                  value={waitingNotes}
                  onChange={(event) => setWaitingNotes(event.target.value)}
                  className={inputClass}
                  placeholder="Preferencias e observacoes"
                />
              </div>
              <Button variant="secondary" onClick={handleCreateWaiting}>
                Adicionar a fila
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {waitingList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-5 text-sm text-slate-500">
                  Nenhuma solicitacao ativa.
                </div>
              ) : (
                waitingList.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-xs text-slate-600"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.fullName ?? "Paciente da base"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.preferredDate ?? "Sem data"} - {item.contactPhone ?? "Sem contato"}
                        </p>
                      </div>
                      <Badge variant={waitStatusVariants[item.status]}>
                        {waitStatusLabels[item.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleWaitingToAppointment(item)}
                      >
                        Agendar
                      </Button>
                      <select
                        value={item.status}
                        onChange={(event) =>
                          handleUpdateWaitingStatus(
                            item.id,
                            event.target.value as WaitStatus
                          )
                        }
                        className="rounded-lg border border-white/60 bg-white/80 px-2 py-1 text-xs text-slate-600"
                      >
                        {Object.entries(waitStatusLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
