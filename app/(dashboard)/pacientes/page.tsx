"use client";

import * as React from "react";
import {
  Download,
  FileUp,
  Filter,
  Stethoscope,
  Tags,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { useActiveClinic } from "../../../hooks/useActiveClinic";
import { supabase } from "../../../lib/supabase/client";

type PatientGender = "female" | "male" | "other" | "unknown";
type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

type PatientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: PatientGender;
  notes: string | null;
  created_at: string;
};

type Patient = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: PatientGender;
  notes: string | null;
  createdAt: string;
};

type PatientTagRow = {
  id: string;
  label: string;
  color: string | null;
};

type PatientTag = {
  id: string;
  label: string;
  color: string | null;
};

type TagAssignmentRow = {
  patient_id: string;
  tag_id: string;
};

type TagAssignment = {
  patientId: string;
  tagId: string;
};

type AppointmentRow = {
  id: string;
  patient_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  chair: { name: string } | null;
};

type Appointment = {
  id: string;
  patientId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  chairName: string | null;
};

type ChairOption = {
  id: string;
  name: string;
};

type RecordRow = {
  id: string;
  patient_id: string;
  title: string;
  record_type: string;
  notes: string | null;
  recorded_at: string;
};

type PatientRecord = {
  id: string;
  patientId: string;
  title: string;
  recordType: string;
  notes: string | null;
  recordedAt: string;
};

type PaymentRow = {
  amount: number | string;
  invoice: { patient_id: string } | null;
};

type PatientMetrics = {
  lastVisit: string | null;
  nextVisit: string | null;
  totalVisits: number;
  totalAppointments: number;
  noShowCount: number;
  noShowRate: number;
  ltv: number;
};

type ImportCandidate = {
  fullName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: PatientGender;
  notes: string | null;
  tags: string[];
};

type SortKey = "recent" | "name" | "lastVisit" | "ltv";

const genderLabels: Record<PatientGender, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Outro",
  unknown: "Nao informado",
};

const genderVariants: Record<
  PatientGender,
  "info" | "success" | "warning" | "default"
> = {
  female: "info",
  male: "success",
  other: "warning",
  unknown: "default",
};

const genderOptions: { value: PatientGender | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Outro" },
  { value: "unknown", label: "Nao informado" },
];

const lastVisitOptions = [
  { value: "all", label: "Todos" },
  { value: "recent_30", label: "Ultimos 30 dias" },
  { value: "recent_90", label: "Ultimos 90 dias" },
  { value: "inactive_180", label: "Inativos 180+ dias" },
  { value: "never", label: "Sem visitas" },
];

const inputClass =
  "w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40";

const tagChipBase =
  "inline-flex items-center gap-2 rounded-full border border-white/70 px-3 py-1 text-xs font-medium transition";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatDate = (value?: string | null) => {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR");
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

const getAge = (birthDate?: string | null) => {
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const diff = Date.now() - parsed.getTime();
  const age = new Date(diff).getUTCFullYear() - 1970;
  return age >= 0 ? age : null;
};

const getDaysBetween = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
};

const parseCsvLine = (line: string, delimiter: string) => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result.map((value) => value.trim());
};

const normalizeHeader = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const parseGender = (value: string): PatientGender => {
  const normalized = value.trim().toLowerCase();
  if (["f", "female", "feminino"].includes(normalized)) return "female";
  if (["m", "male", "masculino"].includes(normalized)) return "male";
  if (["outro", "other"].includes(normalized)) return "other";
  return "unknown";
};

const parseDateInput = (value: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("/")) {
    const [day, month, year] = trimmed.split("/");
    if (!day || !month || !year) return null;
    return `${year.padStart(4, "0")}-${month.padStart(
      2,
      "0"
    )}-${day.padStart(2, "0")}`;
  }
  return trimmed;
};

const escapeCsv = (value: string | number | null) => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/\"/g, '""')}"`;
  }
  return stringValue;
};

export default function PacientesPage() {
  const { activeClinic } = useActiveClinic();
  const clinicId = activeClinic?.id;
  const router = useRouter();

  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [chairs, setChairs] = React.useState<ChairOption[]>([]);
  const [tags, setTags] = React.useState<PatientTag[]>([]);
  const [tagAssignments, setTagAssignments] = React.useState<TagAssignment[]>([]);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [records, setRecords] = React.useState<PatientRecord[]>([]);
  const [payments, setPayments] = React.useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<
    PatientGender | "all"
  >("all");
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
  const [lastVisitFilter, setLastVisitFilter] = React.useState("all");
  const [minLtv, setMinLtv] = React.useState("");
  const [ageMin, setAgeMin] = React.useState("");
  const [ageMax, setAgeMax] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("recent");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [gender, setGender] = React.useState<PatientGender>("unknown");
  const [notes, setNotes] = React.useState("");
  const [formTagIds, setFormTagIds] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  const [tagLabel, setTagLabel] = React.useState("");
  const [tagColor, setTagColor] = React.useState("#22d3ee");

  const [detailPatientId, setDetailPatientId] = React.useState<string | null>(
    null
  );
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduleStart, setScheduleStart] = React.useState(() =>
    toLocalDateTimeInput(new Date().toISOString())
  );
  const [scheduleDuration, setScheduleDuration] = React.useState("60");
  const [scheduleChairId, setScheduleChairId] = React.useState("");
  const [scheduleStatus, setScheduleStatus] =
    React.useState<AppointmentStatus>("scheduled");
  const [scheduleNotes, setScheduleNotes] = React.useState("");
  const [isScheduling, setIsScheduling] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [importQueue, setImportQueue] = React.useState<ImportCandidate[]>([]);
  const [importSkipped, setImportSkipped] = React.useState(0);
  const [isImporting, setIsImporting] = React.useState(false);

  const defaultScheduleTime = React.useCallback(() => {
    const base = new Date();
    base.setDate(base.getDate() + 1);
    base.setHours(10, 0, 0, 0);
    return toLocalDateTimeInput(base.toISOString());
  }, []);

  const loadAll = React.useCallback(async () => {
    if (!clinicId) {
      setPatients([]);
      setTags([]);
      setTagAssignments([]);
      setAppointments([]);
      setRecords([]);
      setPayments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const windowStart = new Date();
    windowStart.setMonth(windowStart.getMonth() - 18);
    const windowEnd = new Date();
    windowEnd.setMonth(windowEnd.getMonth() + 6);

    const [
      patientsRes,
      tagsRes,
      assignmentsRes,
      appointmentsRes,
      recordsRes,
      paymentsRes,
      chairsRes,
    ] = await Promise.all([
      supabase
        .from("patients")
        .select(
          "id, full_name, email, phone, birth_date, gender, notes, created_at"
        )
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false }),
      supabase
        .from("patient_tags")
        .select("id, label, color")
        .eq("clinic_id", clinicId)
        .order("label", { ascending: true }),
      supabase
        .from("patient_tag_assignments")
        .select("patient_id, tag_id")
        .eq("clinic_id", clinicId),
      supabase
        .from("appointments")
        .select("id, patient_id, start_at, end_at, status, chair:chairs(name)")
        .eq("clinic_id", clinicId)
        .gte("start_at", windowStart.toISOString())
        .lte("start_at", windowEnd.toISOString())
        .order("start_at", { ascending: true }),
      supabase
        .from("patient_records")
        .select("id, patient_id, title, record_type, notes, recorded_at")
        .eq("clinic_id", clinicId)
        .order("recorded_at", { ascending: false })
        .limit(200),
      supabase
        .from("payments")
        .select("amount, invoice:invoices(patient_id)")
        .eq("clinic_id", clinicId),
      supabase
        .from("chairs")
        .select("id, name")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true }),
    ]);

    if (
      patientsRes.error ||
      tagsRes.error ||
      assignmentsRes.error ||
      appointmentsRes.error ||
      recordsRes.error ||
      paymentsRes.error ||
      chairsRes.error
    ) {
      setError("Falha ao carregar pacientes e indicadores.");
      setIsLoading(false);
      return;
    }

    const mappedPatients =
      (patientsRes.data as PatientRow[] | null)?.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        birthDate: row.birth_date,
        gender: row.gender,
        notes: row.notes,
        createdAt: row.created_at,
      })) ?? [];

    const mappedTags =
      (tagsRes.data as PatientTagRow[] | null)?.map((row) => ({
        id: row.id,
        label: row.label,
        color: row.color,
      })) ?? [];

    const mappedAssignments =
      (assignmentsRes.data as TagAssignmentRow[] | null)?.map((row) => ({
        patientId: row.patient_id,
        tagId: row.tag_id,
      })) ?? [];

    const mappedAppointments =
      (appointmentsRes.data as AppointmentRow[] | null)?.map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        startAt: row.start_at,
        endAt: row.end_at,
        status: row.status,
        chairName: row.chair?.name ?? null,
      })) ?? [];

    const mappedRecords =
      (recordsRes.data as RecordRow[] | null)?.map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        title: row.title,
        recordType: row.record_type,
        notes: row.notes,
        recordedAt: row.recorded_at,
      })) ?? [];

    const mappedPayments = (paymentsRes.data as PaymentRow[] | null) ?? [];
    const mappedChairs =
      (chairsRes.data as ChairOption[] | null)?.map((row) => ({
        id: row.id,
        name: row.name,
      })) ?? [];

    setPatients(mappedPatients);
    setChairs(mappedChairs);
    setTags(mappedTags);
    setTagAssignments(mappedAssignments);
    setAppointments(mappedAppointments);
    setRecords(mappedRecords);
    setPayments(mappedPayments);
    setIsLoading(false);
  }, [clinicId]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const tagsByPatient = React.useMemo(() => {
    const map = new Map<string, string[]>();
    tagAssignments.forEach((assignment) => {
      const current = map.get(assignment.patientId) ?? [];
      map.set(assignment.patientId, [...current, assignment.tagId]);
    });
    return map;
  }, [tagAssignments]);

  const tagsById = React.useMemo(() => {
    const map = new Map<string, PatientTag>();
    tags.forEach((tag) => map.set(tag.id, tag));
    return map;
  }, [tags]);

  const appointmentsByPatient = React.useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((appointment) => {
      const current = map.get(appointment.patientId) ?? [];
      current.push(appointment);
      map.set(appointment.patientId, current);
    });
    map.forEach((list) =>
      list.sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      )
    );
    return map;
  }, [appointments]);

  const recordsByPatient = React.useMemo(() => {
    const map = new Map<string, PatientRecord[]>();
    records.forEach((record) => {
      const current = map.get(record.patientId) ?? [];
      current.push(record);
      map.set(record.patientId, current);
    });
    return map;
  }, [records]);

  const ltvByPatient = React.useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((payment) => {
      const patientId = payment.invoice?.patient_id;
      if (!patientId) return;
      const amount =
        typeof payment.amount === "number"
          ? payment.amount
          : Number(payment.amount ?? 0);
      map.set(patientId, (map.get(patientId) ?? 0) + amount);
    });
    return map;
  }, [payments]);

  const metricsByPatient = React.useMemo(() => {
    const map = new Map<string, PatientMetrics>();
    patients.forEach((patient) => {
      const list = appointmentsByPatient.get(patient.id) ?? [];
      const now = Date.now();
      let lastVisit: string | null = null;
      let nextVisit: string | null = null;
      let totalVisits = 0;
      let noShowCount = 0;
      list.forEach((appointment) => {
        const when = new Date(appointment.startAt).getTime();
        if (appointment.status === "no_show") noShowCount += 1;
        if (["completed", "confirmed"].includes(appointment.status)) {
          totalVisits += 1;
          if (when <= now) lastVisit = appointment.startAt;
        }
        if (
          ["scheduled", "confirmed"].includes(appointment.status) &&
          when >= now
        ) {
          if (!nextVisit || when < new Date(nextVisit).getTime()) {
            nextVisit = appointment.startAt;
          }
        }
      });
      const totalAppointments = list.length;
      const noShowRate =
        totalAppointments > 0 ? noShowCount / totalAppointments : 0;
      map.set(patient.id, {
        lastVisit,
        nextVisit,
        totalVisits,
        totalAppointments,
        noShowCount,
        noShowRate,
        ltv: ltvByPatient.get(patient.id) ?? 0,
      });
    });
    return map;
  }, [appointmentsByPatient, ltvByPatient, patients]);

  const activeCount = React.useMemo(() => {
    return patients.filter((patient) => {
      const metrics = metricsByPatient.get(patient.id);
      if (!metrics?.lastVisit) return false;
      const days = getDaysBetween(metrics.lastVisit);
      return days !== null && days <= 90;
    }).length;
  }, [metricsByPatient, patients]);

  const averageLtv = React.useMemo(() => {
    if (patients.length === 0) return 0;
    const total = patients.reduce((sum, patient) => {
      const metrics = metricsByPatient.get(patient.id);
      return sum + (metrics?.ltv ?? 0);
    }, 0);
    return total / patients.length;
  }, [metricsByPatient, patients]);

  const totalNoShowRate = React.useMemo(() => {
    let totalNoShow = 0;
    let totalAppointments = 0;
    patients.forEach((patient) => {
      const metrics = metricsByPatient.get(patient.id);
      if (!metrics) return;
      totalNoShow += metrics.noShowCount;
      totalAppointments += metrics.totalAppointments;
    });
    return totalAppointments > 0 ? totalNoShow / totalAppointments : 0;
  }, [metricsByPatient, patients]);

  const filteredPatients = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const minLtvValue = Number.parseFloat(minLtv);
    const ageMinValue = Number.parseInt(ageMin, 10);
    const ageMaxValue = Number.parseInt(ageMax, 10);
    return patients.filter((patient) => {
      if (genderFilter !== "all" && patient.gender !== genderFilter) {
        return false;
      }
      if (term) {
        const matches =
          patient.fullName.toLowerCase().includes(term) ||
          patient.email?.toLowerCase().includes(term) ||
          patient.phone?.toLowerCase().includes(term);
        if (!matches) return false;
      }
      if (selectedTagIds.length > 0) {
        const patientTags = tagsByPatient.get(patient.id) ?? [];
        const hasAll = selectedTagIds.every((tagId) =>
          patientTags.includes(tagId)
        );
        if (!hasAll) return false;
      }
      const metrics = metricsByPatient.get(patient.id);
      if (lastVisitFilter === "never" && metrics?.lastVisit) {
        return false;
      }
      if (lastVisitFilter !== "all") {
        const days = getDaysBetween(metrics?.lastVisit ?? null);
        if (lastVisitFilter === "recent_30" && (days === null || days > 30)) {
          return false;
        }
        if (lastVisitFilter === "recent_90" && (days === null || days > 90)) {
          return false;
        }
        if (lastVisitFilter === "inactive_180" && (days === null || days < 180)) {
          return false;
        }
      }
      if (!Number.isNaN(minLtvValue) && minLtvValue > 0) {
        if ((metrics?.ltv ?? 0) < minLtvValue) return false;
      }
      const age = getAge(patient.birthDate);
      if (!Number.isNaN(ageMinValue) && ageMinValue > 0) {
        if (age === null || age < ageMinValue) return false;
      }
      if (!Number.isNaN(ageMaxValue) && ageMaxValue > 0) {
        if (age === null || age > ageMaxValue) return false;
      }
      return true;
    });
  }, [
    ageMax,
    ageMin,
    genderFilter,
    lastVisitFilter,
    minLtv,
    metricsByPatient,
    patients,
    search,
    selectedTagIds,
    tagsByPatient,
  ]);

  const sortedPatients = React.useMemo(() => {
    const cloned = [...filteredPatients];
    cloned.sort((a, b) => {
      if (sortKey === "name") {
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortKey === "ltv") {
        const aValue = metricsByPatient.get(a.id)?.ltv ?? 0;
        const bValue = metricsByPatient.get(b.id)?.ltv ?? 0;
        return bValue - aValue;
      }
      if (sortKey === "lastVisit") {
        const aValue = metricsByPatient.get(a.id)?.lastVisit;
        const bValue = metricsByPatient.get(b.id)?.lastVisit;
        return new Date(bValue ?? 0).getTime() - new Date(aValue ?? 0).getTime();
      }
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    return cloned;
  }, [filteredPatients, metricsByPatient, sortKey]);

  const resetForm = React.useCallback(() => {
    setEditingId(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setBirthDate("");
    setGender("unknown");
    setNotes("");
    setFormTagIds([]);
  }, []);

  const handleEdit = (patient: Patient) => {
    setEditingId(patient.id);
    setFullName(patient.fullName);
    setEmail(patient.email ?? "");
    setPhone(patient.phone ?? "");
    setBirthDate(patient.birthDate ?? "");
    setGender(patient.gender);
    setNotes(patient.notes ?? "");
    setFormTagIds(tagsByPatient.get(patient.id) ?? []);
  };

  const handleSave = async () => {
    if (!clinicId || !fullName.trim()) {
      setError("Informe o nome do paciente.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      clinic_id: clinicId,
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      birth_date: birthDate || null,
      gender,
      notes: notes.trim() || null,
    };

    if (editingId) {
      const { error: saveError } = await supabase
        .from("patients")
        .update(payload)
        .eq("id", editingId);
      if (saveError) {
        setError("Nao foi possivel salvar o paciente.");
        setIsSaving(false);
        return;
      }

      const currentTagIds = tagsByPatient.get(editingId) ?? [];
      const toAdd = formTagIds.filter((tagId) => !currentTagIds.includes(tagId));
      const toRemove = currentTagIds.filter(
        (tagId) => !formTagIds.includes(tagId)
      );

      if (toAdd.length > 0) {
        await supabase.from("patient_tag_assignments").insert(
          toAdd.map((tagId) => ({
            clinic_id: clinicId,
            patient_id: editingId,
            tag_id: tagId,
          }))
        );
      }

      if (toRemove.length > 0) {
        await supabase
          .from("patient_tag_assignments")
          .delete()
          .eq("patient_id", editingId)
          .in("tag_id", toRemove);
      }
    } else {
      const { data, error: saveError } = await supabase
        .from("patients")
        .insert(payload)
        .select("id")
        .limit(1);
      if (saveError) {
        setError("Nao foi possivel salvar o paciente.");
        setIsSaving(false);
        return;
      }
      const createdId = data?.[0]?.id;
      if (createdId && formTagIds.length > 0) {
        await supabase.from("patient_tag_assignments").insert(
          formTagIds.map((tagId) => ({
            clinic_id: clinicId,
            patient_id: createdId,
            tag_id: tagId,
          }))
        );
      }
    }

    await loadAll();
    resetForm();
    setIsSaving(false);
  };

  const handleDelete = async (patientId: string) => {
    if (!clinicId) return;
    if (!window.confirm("Deseja remover este paciente?")) return;
    setIsSaving(true);
    const { error: deleteError } = await supabase
      .from("patients")
      .delete()
      .eq("id", patientId);
    if (deleteError) {
      setError("Nao foi possivel remover o paciente.");
      setIsSaving(false);
      return;
    }
    await loadAll();
    setIsSaving(false);
  };

  const handleSchedule = async () => {
    if (!clinicId || !detailPatient) return;
    const startIso = toIsoFromLocal(scheduleStart);
    if (!startIso) {
      setError("Informe a data e horario da consulta.");
      return;
    }
    const duration = Number.parseInt(scheduleDuration, 10);
    if (Number.isNaN(duration) || duration <= 0) {
      setError("Duracao invalida.");
      return;
    }
    const endAt = new Date(startIso);
    endAt.setMinutes(endAt.getMinutes() + duration);

    setIsScheduling(true);
    const { error: scheduleError } = await supabase
      .from("appointments")
      .insert({
        clinic_id: clinicId,
        patient_id: detailPatient.id,
        chair_id: scheduleChairId || null,
        start_at: startIso,
        end_at: endAt.toISOString(),
        status: scheduleStatus,
        notes: scheduleNotes.trim() || null,
      });
    if (scheduleError) {
      setError("Nao foi possivel criar a consulta.");
      setIsScheduling(false);
      return;
    }
    await loadAll();
    setScheduleOpen(false);
    setScheduleNotes("");
    setIsScheduling(false);
  };

  const handleCreateTag = async () => {
    if (!clinicId || !tagLabel.trim()) return;
    const { error: tagError } = await supabase.from("patient_tags").insert({
      clinic_id: clinicId,
      label: tagLabel.trim(),
      color: tagColor || null,
    });
    if (tagError) {
      setError("Nao foi possivel criar a tag.");
      return;
    }
    setTagLabel("");
    await loadAll();
  };

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((value) => value !== tagId)
        : [...current, tagId]
    );
  };

  const toggleFormTag = (tagId: string) => {
    setFormTagIds((current) =>
      current.includes(tagId)
        ? current.filter((value) => value !== tagId)
        : [...current, tagId]
    );
  };

  const handleExport = () => {
    const rows = sortedPatients.map((patient) => {
      const metrics = metricsByPatient.get(patient.id);
      const tagIds = tagsByPatient.get(patient.id) ?? [];
      const tagLabels = tagIds
        .map((tagId) => tagsById.get(tagId)?.label)
        .filter(Boolean)
        .join("|");
      return [
        escapeCsv(patient.fullName),
        escapeCsv(patient.email ?? ""),
        escapeCsv(patient.phone ?? ""),
        escapeCsv(patient.birthDate ?? ""),
        escapeCsv(patient.gender),
        escapeCsv(tagLabels),
        escapeCsv(metrics?.lastVisit ?? ""),
        escapeCsv(metrics?.nextVisit ?? ""),
        escapeCsv(metrics?.totalVisits ?? 0),
        escapeCsv((metrics?.ltv ?? 0).toFixed(2)),
      ].join(",");
    });
    const header =
      "full_name,email,phone,birth_date,gender,tags,last_visit,next_visit,total_visits,ltv";
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pacientes.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSelection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length <= 1) return;
    const headerLine = lines[0];
    const commaCount = headerLine.split(",").length;
    const semiCount = headerLine.split(";").length;
    const delimiter = semiCount > commaCount ? ";" : ",";
    const headers = parseCsvLine(headerLine, delimiter).map(normalizeHeader);

    const emailSet = new Set(
      patients
        .map((patient) => patient.email?.toLowerCase())
        .filter(Boolean) as string[]
    );
    const phoneSet = new Set(
      patients
        .map((patient) => patient.phone?.toLowerCase())
        .filter(Boolean) as string[]
    );

    const imported: ImportCandidate[] = [];
    let skipped = 0;

    lines.slice(1).forEach((line) => {
      const values = parseCsvLine(line, delimiter);
      if (values.length === 0) return;
      const data: Record<string, string> = {};
      headers.forEach((header, index) => {
        data[header] = values[index] ?? "";
      });

      const fullName = data.fullname || data.nome || data.full_name || "";
      if (!fullName.trim()) return;
      const emailValue = data.email?.trim() || null;
      const phoneValue =
        data.phone?.trim() ||
        data.telefone?.trim() ||
        data.celular?.trim() ||
        null;
      const birthDateValue =
        parseDateInput(data.birthdate || data.nascimento || data.birth_date) ||
        null;
      const genderValue = parseGender(data.gender || data.sexo || "");
      const notesValue = data.notes?.trim() || data.observacoes?.trim() || null;
      const rawTags = data.tags || data.etiquetas || data.tag || "";
      const parsedTags = Array.from(
        new Set(
          rawTags
            .split(/[|;]/)
            .map((tag) => tag.trim())
            .filter(Boolean)
        )
      );

      const emailKey = emailValue?.toLowerCase() ?? null;
      const phoneKey = phoneValue?.toLowerCase() ?? null;

      if (
        (emailKey && emailSet.has(emailKey)) ||
        (phoneKey && phoneSet.has(phoneKey))
      ) {
        skipped += 1;
        return;
      }
      if (emailKey) emailSet.add(emailKey);
      if (phoneKey) phoneSet.add(phoneKey);

      imported.push({
        fullName: fullName.trim(),
        email: emailValue,
        phone: phoneValue,
        birthDate: birthDateValue,
        gender: genderValue,
        notes: notesValue,
        tags: parsedTags,
      });
    });

    setImportQueue(imported);
    setImportSkipped(skipped);
  };

  const handleImport = async () => {
    if (!clinicId || importQueue.length === 0) return;
    setIsImporting(true);
    const existingTagsByLabel = new Map(
      tags.map((tag) => [tag.label.toLowerCase(), tag])
    );
    const uniqueTagLabels = Array.from(
      new Set(
        importQueue.flatMap((item) =>
          item.tags.map((tag) => tag.trim()).filter(Boolean)
        )
      )
    );
    const tagsToCreate = uniqueTagLabels.filter(
      (label) => !existingTagsByLabel.has(label.toLowerCase())
    );
    if (tagsToCreate.length > 0) {
      const { data: newTags, error: tagError } = await supabase
        .from("patient_tags")
        .insert(
          tagsToCreate.map((label) => ({
            clinic_id: clinicId,
            label,
            color: null,
          }))
        )
        .select("id, label, color");
      if (tagError) {
        setError("Nao foi possivel criar tags no CSV.");
        setIsImporting(false);
        return;
      }
      (newTags ?? []).forEach((tag) => {
        existingTagsByLabel.set(tag.label.toLowerCase(), tag);
      });
    }
    const payload = importQueue.map((item) => ({
      clinic_id: clinicId,
      full_name: item.fullName,
      email: item.email,
      phone: item.phone,
      birth_date: item.birthDate,
      gender: item.gender,
      notes: item.notes,
    }));
    const { data: insertedRows, error: importError } = await supabase
      .from("patients")
      .insert(payload)
      .select("id, email, phone, full_name");
    if (importError) {
      setError("Nao foi possivel importar o CSV.");
      setIsImporting(false);
      return;
    }

    const byEmail = new Map<string, string>();
    const byPhone = new Map<string, string>();
    const byName = new Map<string, string>();
    (insertedRows ?? []).forEach((row) => {
      if (row.email) byEmail.set(row.email.toLowerCase(), row.id);
      if (row.phone) byPhone.set(row.phone.toLowerCase(), row.id);
      byName.set(row.full_name.toLowerCase(), row.id);
    });

    const assignments: { clinic_id: string; patient_id: string; tag_id: string }[] =
      [];
    importQueue.forEach((item) => {
      if (item.tags.length === 0) return;
      const patientId =
        (item.email ? byEmail.get(item.email.toLowerCase()) : null) ??
        (item.phone ? byPhone.get(item.phone.toLowerCase()) : null) ??
        byName.get(item.fullName.toLowerCase()) ??
        null;
      if (!patientId) return;
      item.tags.forEach((tagLabel) => {
        const tag = existingTagsByLabel.get(tagLabel.toLowerCase());
        if (!tag) return;
        assignments.push({
          clinic_id: clinicId,
          patient_id: patientId,
          tag_id: tag.id,
        });
      });
    });

    if (assignments.length > 0) {
      await supabase.from("patient_tag_assignments").insert(assignments);
    }
    setImportQueue([]);
    setImportSkipped(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await loadAll();
    setIsImporting(false);
  };

  const detailPatient = detailPatientId
    ? patients.find((patient) => patient.id === detailPatientId) ?? null
    : null;

  const detailMetrics = detailPatient
    ? metricsByPatient.get(detailPatient.id)
    : null;

  const detailTags = detailPatient
    ? (tagsByPatient.get(detailPatient.id) ?? [])
        .map((tagId) => tagsById.get(tagId))
        .filter(Boolean)
    : [];

  const detailAppointments = detailPatient
    ? appointmentsByPatient.get(detailPatient.id) ?? []
    : [];

  const detailRecords = detailPatient
    ? recordsByPatient.get(detailPatient.id) ?? []
    : [];

  React.useEffect(() => {
    if (!detailPatientId) {
      setScheduleOpen(false);
      return;
    }
    setScheduleStart(defaultScheduleTime());
    setScheduleDuration("60");
    setScheduleStatus("scheduled");
    setScheduleNotes("");
    setScheduleChairId("");
  }, [defaultScheduleTime, detailPatientId]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Pacientes
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Centro do paciente
          </h1>
          <p className="text-sm text-slate-500">
            Segmentacao inteligente, historico completo e insights clinicos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={loadAll}>
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button variant="glow" onClick={resetForm}>
            Novo paciente
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportSelection}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Total de pacientes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {patients.length}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Ativos nos ultimos 90 dias</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {activeCount}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">LTV medio</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {currency.format(averageLtv)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Taxa de faltas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {Math.round(totalNoShowRate * 100)}%
          </p>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Filter className="h-4 w-4 text-cyan-500" />
              Filtros inteligentes
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setGenderFilter("all");
                setSelectedTagIds([]);
                setLastVisitFilter("all");
                setMinLtv("");
                setAgeMin("");
                setAgeMax("");
                setSortKey("recent");
              }}
            >
              Limpar filtros
            </Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Buscar</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={inputClass}
                placeholder="Nome, email ou telefone"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Genero</label>
              <select
                value={genderFilter}
                onChange={(event) =>
                  setGenderFilter(event.target.value as PatientGender | "all")
                }
                className={inputClass}
              >
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Ultima visita</label>
              <select
                value={lastVisitFilter}
                onChange={(event) => setLastVisitFilter(event.target.value)}
                className={inputClass}
              >
                {lastVisitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Idade min</label>
                <input
                  value={ageMin}
                  onChange={(event) => setAgeMin(event.target.value)}
                  className={inputClass}
                  placeholder="Ex: 18"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Idade max</label>
                <input
                  value={ageMax}
                  onChange={(event) => setAgeMax(event.target.value)}
                  className={inputClass}
                  placeholder="Ex: 65"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">LTV minimo</label>
              <input
                value={minLtv}
                onChange={(event) => setMinLtv(event.target.value)}
                className={inputClass}
                placeholder="Ex: 1500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Ordenar por</label>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className={inputClass}
              >
                <option value="recent">Mais recentes</option>
                <option value="name">Nome</option>
                <option value="lastVisit">Ultima visita</option>
                <option value="ltv">Maior LTV</option>
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Tags className="h-4 w-4 text-indigo-500" />
              Tags selecionadas (todas)
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <span className="text-xs text-slate-400">
                  Crie tags para segmentar pacientes.
                </span>
              ) : (
                tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      className={`${tagChipBase} ${
                        active
                          ? "bg-slate-900/10 text-slate-900"
                          : "bg-white/70 text-slate-500"
                      }`}
                      style={
                        tag.color
                          ? {
                              borderColor: `${tag.color}40`,
                              color: active ? tag.color : undefined,
                            }
                          : undefined
                      }
                      onClick={() => toggleTagFilter(tag.id)}
                      type="button"
                    >
                      {tag.label}
                      {active ? "x" : "+"}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserRound className="h-4 w-4 text-cyan-500" />
              Cadastro rapido
            </div>
            <Badge variant="default">{editingId ? "Edicao" : "Novo"}</Badge>
          </div>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Nome completo</label>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClass}
                placeholder="Nome do paciente"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Email</label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                  placeholder="email@clinica.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Telefone</label>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={inputClass}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Nascimento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Genero</label>
                <select
                  value={gender}
                  onChange={(event) =>
                    setGender(event.target.value as PatientGender)
                  }
                  className={inputClass}
                >
                  {genderOptions
                    .filter((option) => option.value !== "all")
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Notas</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={`${inputClass} min-h-[90px] resize-none`}
                placeholder="Preferencias, restricoes, observacoes"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Tags do paciente</label>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <span className="text-xs text-slate-400">
                    Nenhuma tag criada ainda.
                  </span>
                ) : (
                  tags.map((tag) => {
                    const active = formTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`${tagChipBase} ${
                          active
                            ? "bg-slate-900/10 text-slate-900"
                            : "bg-white/70 text-slate-500"
                        }`}
                        style={
                          tag.color
                            ? {
                                borderColor: `${tag.color}40`,
                                color: active ? tag.color : undefined,
                              }
                            : undefined
                        }
                        onClick={() => toggleFormTag(tag.id)}
                      >
                        {tag.label}
                        {active ? "x" : "+"}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="glow"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar paciente"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>
                Limpar
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {error ? (
        <Card className="border-rose-200 bg-rose-50/70 text-sm text-rose-700">
          {error}
        </Card>
      ) : null}

      {importQueue.length > 0 ? (
        <Card className="border-cyan-200/70 bg-cyan-50/60 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Importacao pronta
              </p>
              <p className="text-xs text-slate-500">
                {importQueue.length} registros validos, {importSkipped} ignorados.
              </p>
            </div>
            <Button variant="glow" onClick={handleImport} disabled={isImporting}>
              {isImporting ? "Importando..." : "Confirmar importacao"}
            </Button>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.5fr_0.7fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Lista de pacientes
              </p>
              <p className="text-xs text-slate-500">
                {sortedPatients.length} registros encontrados
              </p>
            </div>
            <Badge variant="info">{sortedPatients.length}</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-5 text-sm text-slate-500">
                Carregando pacientes...
              </div>
            ) : sortedPatients.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-5 text-sm text-slate-500">
                Nenhum paciente encontrado.
              </div>
            ) : (
              sortedPatients.map((patient) => {
                const metrics = metricsByPatient.get(patient.id);
                const patientTags = tagsByPatient.get(patient.id) ?? [];
                const isInactive = (getDaysBetween(metrics?.lastVisit) ?? 0) > 180;
                const riskHigh = (metrics?.noShowRate ?? 0) >= 0.35;
                return (
                  <div
                    key={patient.id}
                    className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm shadow-sm shadow-indigo-500/10"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {patient.fullName}
                          </p>
                          <Badge variant={genderVariants[patient.gender]}>
                            {genderLabels[patient.gender]}
                          </Badge>
                          {isInactive ? (
                            <Badge variant="warning">Inativo</Badge>
                          ) : null}
                          {riskHigh ? (
                            <Badge variant="danger">Risco falta</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500">
                          {patient.email ?? "Sem email"} -{" "}
                          {patient.phone ?? "Sem telefone"}
                        </p>
                        {patientTags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {patientTags.slice(0, 4).map((tagId) => {
                              const tag = tagsById.get(tagId);
                              if (!tag) return null;
                              return (
                                <Badge
                                  key={tagId}
                                  variant="default"
                                  className="border border-white/70"
                                  style={
                                    tag.color
                                      ? {
                                          borderColor: `${tag.color}40`,
                                          color: tag.color,
                                        }
                                      : undefined
                                  }
                                >
                                  {tag.label}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-[11px] uppercase">Ultima visita</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(metrics?.lastVisit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase">Proxima visita</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(metrics?.nextVisit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase">Visitas</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {metrics?.totalVisits ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase">LTV</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {currency.format(metrics?.ltv ?? 0)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDetailPatientId(patient.id)}
                        >
                          Detalhes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(patient)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(patient.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Tags className="h-4 w-4 text-indigo-500" />
                Tags do consultorio
              </div>
              <Badge variant="info">{tags.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={tagLabel}
                  onChange={(event) => setTagLabel(event.target.value)}
                  className={inputClass}
                  placeholder="Nova tag"
                />
                <input
                  type="color"
                  value={tagColor}
                  onChange={(event) => setTagColor(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/60 bg-white/80 p-1 shadow-sm"
                />
              </div>
              <Button variant="secondary" onClick={handleCreateTag}>
                Criar tag
              </Button>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <span className="text-xs text-slate-400">
                    Nenhuma tag criada.
                  </span>
                ) : (
                  tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="default"
                      className="border border-white/70"
                      style={
                        tag.color
                          ? { borderColor: `${tag.color}40`, color: tag.color }
                          : undefined
                      }
                    >
                      {tag.label}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Stethoscope className="h-4 w-4 text-cyan-500" />
                Insights rapidos
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>
                Pacientes com alta taxa de faltas merecem follow-up proativo e
                confirmacao antecipada.
              </p>
              <p>
                Use tags para criar campanhas de reativacao e acompanhar LTV por
                segmento.
              </p>
              <p>
                Exporte o CSV para enviar para BI ou automacoes de marketing.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {detailPatient ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDetailPatientId(null)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto p-4">
            <Card className="min-h-full">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Paciente 360
                  </p>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {detailPatient.fullName}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {detailPatient.email ?? "Sem email"} -{" "}
                    {detailPatient.phone ?? "Sem telefone"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setScheduleOpen((open) => !open)}
                  >
                    {scheduleOpen ? "Fechar agendamento" : "Agendar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      router.push(`/agenda?patientId=${detailPatient.id}`);
                      setDetailPatientId(null);
                    }}
                  >
                    Abrir agenda
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDetailPatientId(null)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>

              {scheduleOpen ? (
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Agendar consulta
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500">
                        Data e horario
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduleStart}
                        onChange={(event) => setScheduleStart(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500">
                        Duracao (min)
                      </label>
                      <input
                        value={scheduleDuration}
                        onChange={(event) =>
                          setScheduleDuration(event.target.value)
                        }
                        className={inputClass}
                        placeholder="60"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500">Cadeira</label>
                      <select
                        value={scheduleChairId}
                        onChange={(event) =>
                          setScheduleChairId(event.target.value)
                        }
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
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500">Status</label>
                      <select
                        value={scheduleStatus}
                        onChange={(event) =>
                          setScheduleStatus(
                            event.target.value as AppointmentStatus
                          )
                        }
                        className={inputClass}
                      >
                        <option value="scheduled">Agendado</option>
                        <option value="confirmed">Confirmado</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Notas</label>
                    <textarea
                      value={scheduleNotes}
                      onChange={(event) => setScheduleNotes(event.target.value)}
                      className={`${inputClass} min-h-[80px] resize-none`}
                      placeholder="Observacoes da consulta"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="glow"
                      onClick={handleSchedule}
                      disabled={isScheduling}
                    >
                      {isScheduling ? "Agendando..." : "Confirmar agenda"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setScheduleOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Card className="border border-white/60 bg-white/70">
                  <p className="text-xs text-slate-500">Ultima visita</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatDate(detailMetrics?.lastVisit ?? null)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Proxima: {formatDate(detailMetrics?.nextVisit ?? null)}
                  </p>
                </Card>
                <Card className="border border-white/60 bg-white/70">
                  <p className="text-xs text-slate-500">LTV total</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {currency.format(detailMetrics?.ltv ?? 0)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Visitas: {detailMetrics?.totalVisits ?? 0}
                  </p>
                </Card>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Tags</p>
                  <Badge variant="default">{detailTags.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailTags.length === 0 ? (
                    <span className="text-xs text-slate-400">
                      Sem tags atribuida.
                    </span>
                  ) : (
                    detailTags.map((tag) => (
                      <Badge
                        key={tag?.id}
                        variant="default"
                        className="border border-white/70"
                        style={
                          tag?.color
                            ? {
                                borderColor: `${tag.color}40`,
                                color: tag.color,
                              }
                            : undefined
                        }
                      >
                        {tag?.label}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  Proximas consultas
                </p>
                <div className="space-y-2">
                  {detailAppointments.filter(
                    (appointment) =>
                      new Date(appointment.startAt).getTime() >= Date.now()
                  ).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-4 text-xs text-slate-500">
                      Nenhuma consulta futura registrada.
                    </div>
                  ) : (
                    detailAppointments
                      .filter(
                        (appointment) =>
                          new Date(appointment.startAt).getTime() >= Date.now()
                      )
                      .slice(0, 4)
                      .map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-xs text-slate-600"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {formatDateTime(appointment.startAt)}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {appointment.chairName ?? "Sem cadeira"}
                            </p>
                          </div>
                          <Badge variant="info">{appointment.status}</Badge>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  Registros clinicos recentes
                </p>
                <div className="space-y-2">
                  {detailRecords.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-4 text-xs text-slate-500">
                      Nenhum registro clinico encontrado.
                    </div>
                  ) : (
                    detailRecords.slice(0, 6).map((record) => (
                      <div
                        key={record.id}
                        className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-xs text-slate-600"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900">
                            {record.title}
                          </p>
                          <Badge variant="default">{record.recordType}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {formatDate(record.recordedAt)}
                        </p>
                        {record.notes ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {record.notes}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
