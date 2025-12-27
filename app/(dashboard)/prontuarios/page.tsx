"use client";

import * as React from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { useActiveClinic } from "../../../hooks/useActiveClinic";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { supabase } from "../../../lib/supabase/client";

type RecordType = "avaliacao" | "evolucao" | "procedimento" | "exame" | "retorno";

type RecordRow = {
  id: string;
  title: string;
  record_type: RecordType;
  notes: string | null;
  recorded_at: string;
  patient_id: string;
  patient: { id: string; full_name: string } | null;
};

type PatientRecord = {
  id: string;
  title: string;
  recordType: RecordType;
  notes: string | null;
  recordedAt: string;
  patientId: string;
  patientName: string;
};

type PatientOption = { id: string; full_name: string };

const recordOptions: { value: RecordType | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "avaliacao", label: "Avaliacao" },
  { value: "evolucao", label: "Evolucao" },
  { value: "procedimento", label: "Procedimento" },
  { value: "exame", label: "Exame" },
  { value: "retorno", label: "Retorno" },
];

const recordVariants: Record<RecordType, "info" | "success" | "warning"> = {
  avaliacao: "info",
  evolucao: "success",
  procedimento: "warning",
  exame: "info",
  retorno: "success",
};

const inputClass =
  "w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40";

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

const formatDay = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR");

const formatHour = (value: string) =>
  new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ProntuariosPage() {
  const { activeClinic } = useActiveClinic();
  const { user } = useAuthSession();
  const clinicId = activeClinic?.id;

  const [records, setRecords] = React.useState<PatientRecord[]>([]);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [recordFilter, setRecordFilter] = React.useState<RecordType | "all">(
    "all"
  );
  const [patientFilter, setPatientFilter] = React.useState("all");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [patientId, setPatientId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [recordType, setRecordType] = React.useState<RecordType>("evolucao");
  const [recordedAt, setRecordedAt] = React.useState(() =>
    toLocalDateTimeInput(new Date().toISOString())
  );
  const [notes, setNotes] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const loadLookups = React.useCallback(async () => {
    if (!clinicId) {
      setPatients([]);
      return;
    }

    const { data } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("clinic_id", clinicId)
      .order("full_name", { ascending: true });

    setPatients(data ?? []);
  }, [clinicId]);

  const loadRecords = React.useCallback(async () => {
    if (!clinicId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("patient_records")
      .select(
        "id, title, record_type, notes, recorded_at, patient_id, patient:patients(id, full_name)"
      )
      .eq("clinic_id", clinicId)
      .order("recorded_at", { ascending: false })
      .limit(120);

    if (fetchError) {
      setError("Falha ao carregar prontuarios.");
      setIsLoading(false);
      return;
    }

    const mapped = (data as RecordRow[] | null)?.map((row) => ({
      id: row.id,
      title: row.title,
      recordType: row.record_type,
      notes: row.notes,
      recordedAt: row.recorded_at,
      patientId: row.patient_id,
      patientName: row.patient?.full_name ?? "Paciente",
    }));

    setRecords(mapped ?? []);
    setIsLoading(false);
  }, [clinicId]);

  React.useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  React.useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  React.useEffect(() => {
    if (!patientId && patients.length > 0) {
      setPatientId(patients[0].id);
    }
  }, [patientId, patients]);

  const filteredRecords = records.filter((record) => {
    if (recordFilter !== "all" && record.recordType !== recordFilter) {
      return false;
    }
    if (patientFilter !== "all" && record.patientId !== patientFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      record.title.toLowerCase().includes(term) ||
      record.notes?.toLowerCase().includes(term) ||
      record.patientName.toLowerCase().includes(term)
    );
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setRecordType("evolucao");
    setRecordedAt(toLocalDateTimeInput(new Date().toISOString()));
    setNotes("");
    if (patients[0]) setPatientId(patients[0].id);
  };

  const handleEdit = (record: PatientRecord) => {
    setEditingId(record.id);
    setTitle(record.title);
    setRecordType(record.recordType);
    setRecordedAt(toLocalDateTimeInput(record.recordedAt));
    setNotes(record.notes ?? "");
    setPatientId(record.patientId);
  };

  const handleSave = async () => {
    if (!clinicId || !patientId || !title.trim()) {
      setError("Preencha titulo e paciente.");
      return;
    }

    const recordedIso = toIsoFromLocal(recordedAt);
    if (!recordedIso) {
      setError("Informe uma data valida.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      clinic_id: clinicId,
      patient_id: patientId,
      title: title.trim(),
      record_type: recordType,
      notes: notes.trim() || null,
      recorded_at: recordedIso,
      created_by: user?.id ?? null,
    };

    const { error: saveError } = editingId
      ? await supabase.from("patient_records").update(payload).eq("id", editingId)
      : await supabase.from("patient_records").insert(payload);

    if (saveError) {
      setError("Nao foi possivel salvar o prontuario.");
      setIsSaving(false);
      return;
    }

    await loadRecords();
    resetForm();
    setIsSaving(false);
  };

  const handleDelete = async (recordId: string) => {
    if (!clinicId) return;
    if (!window.confirm("Deseja remover este prontuario?")) return;
    setIsSaving(true);
    const { error: deleteError } = await supabase
      .from("patient_records")
      .delete()
      .eq("id", recordId);

    if (deleteError) {
      setError("Nao foi possivel remover o prontuario.");
      setIsSaving(false);
      return;
    }

    await loadRecords();
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Prontuarios
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Evolucao clinica
          </h1>
          <p className="text-sm text-slate-500">
            Registro clinico, observacoes e acompanhamento do paciente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={loadRecords}>
            Atualizar
          </Button>
          <Button variant="glow" onClick={resetForm}>
            Novo registro
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Card className="md:col-span-2">
          <label className="text-xs text-slate-500">Buscar prontuario</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass}
            placeholder="Paciente, titulo ou observacao"
          />
        </Card>
        <Card>
          <label className="text-xs text-slate-500">Tipo</label>
          <select
            value={recordFilter}
            onChange={(event) =>
              setRecordFilter(event.target.value as RecordType | "all")
            }
            className={inputClass}
          >
            {recordOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Card>
        <Card>
          <label className="text-xs text-slate-500">Paciente</label>
          <select
            value={patientFilter}
            onChange={(event) => setPatientFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">Todos</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name}
              </option>
            ))}
          </select>
        </Card>
      </section>

      {error ? (
        <Card className="border-rose-200 bg-rose-50/70 text-sm text-rose-700">
          {error}
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Registros recentes
              </p>
              <p className="text-xs text-slate-500">
                {filteredRecords.length} prontuarios encontrados
              </p>
            </div>
            <Badge variant="info">{filteredRecords.length}</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-5 text-sm text-slate-500">
                Carregando prontuarios...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-5 text-sm text-slate-500">
                Nenhum prontuario encontrado.
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm shadow-sm shadow-indigo-500/10"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {record.title}
                      </p>
                      <Badge variant={recordVariants[record.recordType]}>
                        {record.recordType}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {record.patientName} • {formatDay(record.recordedAt)} •{" "}
                      {formatHour(record.recordedAt)}
                    </p>
                    {record.notes ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {record.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(record)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(record.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {editingId ? "Editar prontuario" : "Novo prontuario"}
              </p>
              <p className="text-xs text-slate-500">
                TODO: anexos e imagens clinicas.
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
              <label className="text-xs text-slate-500">Titulo</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={inputClass}
                placeholder="Ex: Avaliacao inicial"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Tipo</label>
                <select
                  value={recordType}
                  onChange={(event) =>
                    setRecordType(event.target.value as RecordType)
                  }
                  className={inputClass}
                >
                  {recordOptions
                    .filter((option) => option.value !== "all")
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Data</label>
                <input
                  type="datetime-local"
                  value={recordedAt}
                  onChange={(event) => setRecordedAt(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500">Observacoes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className={inputClass}
                placeholder="Descricao clinica e plano de tratamento"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="glow" onClick={handleSave} disabled={isSaving}>
                Salvar prontuario
              </Button>
              {editingId ? (
                <Button variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
