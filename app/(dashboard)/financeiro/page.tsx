"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, Download, Plus, RefreshCw } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Progress } from "../../../components/ui/progress";
import { useActiveClinic } from "../../../hooks/useActiveClinic";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { useFinanceData } from "../../../hooks/useFinanceData";
import { supabase } from "../../../lib/supabase/client";

type EntryType = "receita" | "despesa";
type RangePreset = "30d" | "90d" | "180d" | "365d" | "custom";

const expenseCategories = [
  "fixo",
  "pessoal",
  "insumos",
  "marketing",
  "operacional",
  "outros",
];

const revenueCategories = ["consultas", "assinatura", "loja", "outros"];

const recurrenceOptions = [
  { label: "Sem recorrencia", value: "0" },
  { label: "3 meses", value: "3" },
  { label: "6 meses", value: "6" },
  { label: "12 meses", value: "12" },
];

const rangeOptions: { value: RangePreset; label: string; days?: number }[] = [
  { value: "30d", label: "Ultimos 30 dias", days: 30 },
  { value: "90d", label: "Ultimos 90 dias", days: 90 },
  { value: "180d", label: "Ultimos 6 meses", days: 180 },
  { value: "365d", label: "Ultimos 12 meses", days: 365 },
  { value: "custom", label: "Personalizado" },
];

const inputClass =
  "w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40";

const pad = (value: number) => value.toString().padStart(2, "0");
const toDateInput = (value: Date) =>
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR")}`;

const formatDateLabel = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");

const monthLabels = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

type MonthlyPoint = {
  month: string;
  revenue: number;
  expenses: number;
  balance: number;
};

function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-6 text-sm text-slate-500">
        Sem dados suficientes para o grafico no periodo.
      </div>
    );
  }

  const width = 560;
  const height = 220;
  const padding = 28;
  const maxValue = Math.max(
    ...data.map((point) => Math.max(point.revenue, point.expenses, point.balance)),
    1
  );

  const buildPoints = (values: number[]) =>
    values.map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (value / maxValue) * (height - padding * 2);
      return { x, y, value };
    });

  const revenuePoints = buildPoints(data.map((point) => point.revenue));
  const expensePoints = buildPoints(data.map((point) => point.expenses));
  const balancePoints = buildPoints(data.map((point) => point.balance));

  const buildPath = (points: { x: number; y: number }[]) =>
    points
      .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(" ");

  const balancePath = buildPath(balancePoints);
  const balanceArea = `${balancePath} L ${width - padding} ${height - padding} L ${padding} ${
    height - padding
  } Z`;

  const hoverIndex = activeIndex ?? data.length - 1;
  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = Math.min(Math.max(x / rect.width, 0), 1);
    const index = Math.round(ratio * (data.length - 1));
    setActiveIndex(index);
  };

  return (
    <div
      className="relative mt-4 h-56 w-full"
      onMouseMove={handleMove}
      onMouseLeave={() => setActiveIndex(null)}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="balanceArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(79,70,229,0.25)" />
            <stop offset="100%" stopColor="rgba(79,70,229,0)" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={width - padding}
            y1={padding + line * ((height - padding * 2) / 3)}
            y2={padding + line * ((height - padding * 2) / 3)}
            stroke="rgba(148,163,184,0.3)"
            strokeDasharray="4 6"
          />
        ))}
        <path d={balanceArea} fill="url(#balanceArea)" />
        <path
          d={buildPath(revenuePoints)}
          fill="none"
          stroke="rgba(20,184,166,0.9)"
          strokeWidth="2.2"
        />
        <path
          d={buildPath(expensePoints)}
          fill="none"
          stroke="rgba(248,113,113,0.9)"
          strokeWidth="2.2"
        />
        <path
          d={balancePath}
          fill="none"
          stroke="rgba(79,70,229,0.9)"
          strokeWidth="2.4"
        />
        {balancePoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={activeIndex === index ? 4 : 2.5}
            fill={activeIndex === index ? "rgba(79,70,229,0.9)" : "rgba(129,140,248,0.7)"}
          />
        ))}
      </svg>

      <div
        className="absolute top-3 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-lg shadow-indigo-500/10 backdrop-blur"
        style={{
          left: `${(hoverIndex / Math.max(data.length - 1, 1)) * 100}%`,
          transform: "translate(-50%, 0)",
        }}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
          {monthLabels[new Date(`${data[hoverIndex].month}T00:00:00`).getMonth()]}
        </p>
        <div className="mt-2 space-y-1">
          <p>
            Receitas: <span className="font-semibold text-slate-900">{formatCurrency(data[hoverIndex].revenue)}</span>
          </p>
          <p>
            Despesas: <span className="font-semibold text-slate-900">{formatCurrency(data[hoverIndex].expenses)}</span>
          </p>
          <p>
            Saldo: <span className="font-semibold text-slate-900">{formatCurrency(data[hoverIndex].balance)}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-between text-[11px] uppercase tracking-[0.2em] text-slate-400">
        {data.map((point) => (
          <span key={point.month}>
            {monthLabels[new Date(`${point.month}T00:00:00`).getMonth()]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FinancePage() {
  const { activeClinic } = useActiveClinic();
  const { user } = useAuthSession();
  const clinicId = activeClinic?.id;

  const today = React.useMemo(() => new Date(), []);
  const [rangePreset, setRangePreset] = React.useState<RangePreset>("90d");
  const [fromDate, setFromDate] = React.useState(() =>
    toDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90))
  );
  const [toDate, setToDate] = React.useState(() => toDateInput(today));

  React.useEffect(() => {
    const preset = rangeOptions.find((option) => option.value === rangePreset);
    if (!preset || preset.value === "custom" || !preset.days) return;
    const now = new Date();
    setFromDate(toDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - preset.days)));
    setToDate(toDateInput(now));
  }, [rangePreset]);

  const { data, isLoading, error, refresh } = useFinanceData(clinicId, {
    from: fromDate,
    to: toDate,
  });

  const [entryType, setEntryType] = React.useState<EntryType>("despesa");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState(expenseCategories[0]);
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(() => toDateInput(new Date()));
  const [recurrence, setRecurrence] = React.useState("0");
  const [budgetCategory, setBudgetCategory] = React.useState(expenseCategories[0]);
  const [budgetLimit, setBudgetLimit] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (entryType === "despesa") {
      setCategory(expenseCategories[0]);
    } else {
      setCategory(revenueCategories[0]);
    }
  }, [entryType]);

  const handleExport = () => {
    if (!data?.entries) return;
    const rows = [
      ["Tipo", "Descricao", "Categoria", "Origem", "Valor", "Data"],
      ...data.entries.map((entry) => [
        entry.type,
        entry.description,
        entry.category ?? "",
        entry.source,
        entry.amount.toFixed(2),
        new Date(entry.paidAt).toLocaleDateString("pt-BR"),
      ]),
    ];
    const csv = rows.map((row) => row.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `financeiro_${fromDate}_${toDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateEntry = async () => {
    if (!clinicId) return;
    const numericAmount = Number(amount.replace(",", "."));
    if (!description || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }

    setIsSubmitting(true);
    const repeats = Math.max(0, Number(recurrence));
    const baseDate = new Date(date);

    const entries = Array.from({ length: repeats > 0 ? repeats : 1 }).map(
      (_, index) => {
        const nextDate = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth() + index,
          baseDate.getDate()
        );
        return {
          clinic_id: clinicId,
          description,
          category,
          amount: numericAmount,
          paid_at: nextDate.toISOString(),
          received_at: nextDate.toISOString(),
          created_by: user?.id ?? null,
        };
      }
    );

    if (entryType === "despesa") {
      const { error: insertError } = await supabase.from("expenses").insert(
        entries.map((entry) => ({
          clinic_id: entry.clinic_id,
          description: entry.description,
          category: entry.category,
          amount: entry.amount,
          paid_at: entry.paid_at,
          created_by: entry.created_by,
        }))
      );
      if (insertError) {
        setIsSubmitting(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("revenue_entries").insert(
        entries.map((entry) => ({
          clinic_id: entry.clinic_id,
          description: entry.description,
          category: entry.category,
          amount: entry.amount,
          received_at: entry.received_at,
          created_by: entry.created_by,
        }))
      );
      if (insertError) {
        setIsSubmitting(false);
        return;
      }
    }

    setDescription("");
    setAmount("");
    setRecurrence("0");
    await refresh();
    setIsSubmitting(false);
  };

  const handleSaveBudget = async () => {
    if (!clinicId) return;
    const limitValue = Number(budgetLimit.replace(",", "."));
    if (Number.isNaN(limitValue) || limitValue < 0) return;

    setIsSubmitting(true);
    await supabase.from("budgets").upsert(
      {
        clinic_id: clinicId,
        category: budgetCategory,
        monthly_limit: limitValue,
        created_by: user?.id ?? null,
      },
      { onConflict: "clinic_id,category" }
    );
    setBudgetLimit("");
    await refresh();
    setIsSubmitting(false);
  };

  const summary = data ?? {
    totalRevenue: 0,
    totalExpenses: 0,
    balance: 0,
    averageMonthly: 0,
    entries: [],
    recentEntries: [],
    budgets: [],
    monthlySeries: [],
    expenseCategories: [],
    revenueCategories: [],
  };

  const rangeLabel =
    fromDate && toDate ? `${formatDateLabel(fromDate)} - ${formatDateLabel(toDate)}` : "Periodo atual";

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Financeiro</p>
          <h1 className="text-2xl font-semibold text-slate-900">Fluxo de caixa</h1>
          <p className="text-sm text-slate-500">
            Relatorios, movimentacoes e metas por periodo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={refresh} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="glow" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Card className="md:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-500">Periodo</label>
              <select
                value={rangePreset}
                onChange={(event) => setRangePreset(event.target.value as RangePreset)}
                className={inputClass}
              >
                {rangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Resumo</label>
              <div className="flex h-11 items-center rounded-xl border border-white/60 bg-white/70 px-3 text-sm text-slate-600">
                {rangeLabel}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <label className="text-xs text-slate-500">De</label>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setRangePreset("custom");
            }}
            className={inputClass}
          />
        </Card>
        <Card>
          <label className="text-xs text-slate-500">Ate</label>
          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value);
              setRangePreset("custom");
            }}
            className={inputClass}
          />
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Receitas no periodo</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Despesas no periodo</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
              <ArrowDownLeft className="h-5 w-5" />
            </span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Saldo liquido</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatCurrency(summary.balance)}
              </p>
            </div>
            <Badge variant={summary.balance >= 0 ? "success" : "danger"}>
              {summary.balance >= 0 ? "Saudavel" : "Ajuste necessario"}
            </Badge>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Media mensal</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatCurrency(summary.averageMonthly)}
              </p>
            </div>
            <Badge variant="info">Range ativo</Badge>
          </div>
        </Card>
      </section>

      {error ? (
        <Card className="border-rose-200 bg-rose-50/70 text-sm text-rose-700">{error}</Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Evolucao mensal</p>
              <p className="text-xs text-slate-500">
                Receita, despesas e saldo ao longo do periodo.
              </p>
            </div>
            <Badge variant="info">{summary.monthlySeries.length} meses</Badge>
          </div>
          <MonthlyChart data={summary.monthlySeries} />
        </Card>

        <div className="grid gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Despesas por categoria</p>
                <p className="text-xs text-slate-500">Top categorias no periodo.</p>
              </div>
              <Badge variant="warning">{summary.expenseCategories.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {summary.expenseCategories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-5 text-sm text-slate-500">
                  Sem despesas registradas.
                </div>
              ) : (
                summary.expenseCategories.slice(0, 5).map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="uppercase tracking-[0.2em]">{item.category}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                    <Progress value={item.total} max={summary.totalExpenses || 1} indicatorClassName="from-rose-500 via-rose-400 to-orange-400" />
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Receitas por origem</p>
                <p className="text-xs text-slate-500">Mix de receita.</p>
              </div>
              <Badge variant="info">{summary.revenueCategories.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {summary.revenueCategories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-5 text-sm text-slate-500">
                  Sem receitas registradas.
                </div>
              ) : (
                summary.revenueCategories.slice(0, 5).map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="uppercase tracking-[0.2em]">{item.category}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                    <Progress value={item.total} max={summary.totalRevenue || 1} />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Lancamentos no periodo</p>
              <p className="text-xs text-slate-500">Entradas e saidas detalhadas.</p>
            </div>
            <Badge variant="info">{summary.recentEntries.length} itens</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {summary.recentEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200/80 bg-white/60 px-4 py-5 text-sm text-slate-500">
                Nenhum lancamento recente.
              </div>
            ) : (
              summary.recentEntries.map((entry) => (
                <div
                  key={`${entry.type}-${entry.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm shadow-indigo-500/10"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{entry.description}</p>
                    <p className="text-xs text-slate-500">
                      {entry.category} • {entry.source}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={entry.type === "receita" ? "text-emerald-600" : "text-rose-600"}>
                      {entry.type === "receita" ? "+" : "-"}
                      {formatCurrency(entry.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(entry.paidAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Nova movimentacao</p>
              <p className="text-xs text-slate-500">Registre entradas e saidas.</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <Plus className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={entryType === "despesa" ? "glow" : "secondary"}
                onClick={() => setEntryType("despesa")}
                className="w-full"
              >
                Despesa
              </Button>
              <Button
                variant={entryType === "receita" ? "glow" : "secondary"}
                onClick={() => setEntryType("receita")}
                className="w-full"
              >
                Receita
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500">Descricao</label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={inputClass}
                placeholder="Ex: Aluguel, Receita premium"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Categoria</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={inputClass}
                >
                  {(entryType === "despesa" ? expenseCategories : revenueCategories).map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Valor</label>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className={inputClass}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Data</label>
                <input
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  type="date"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Recorrencia</label>
                <select
                  value={recurrence}
                  onChange={(event) => setRecurrence(event.target.value)}
                  className={inputClass}
                >
                  {recurrenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button variant="glow" className="w-full" onClick={handleCreateEntry} disabled={isSubmitting}>
              Salvar lancamento
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Budgets por categoria</p>
              <p className="text-xs text-slate-500">Limites vs gastos no periodo.</p>
            </div>
            <Badge variant="info">{summary.budgets.length} metas</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {summary.budgets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200/80 bg-white/60 px-4 py-5 text-sm text-slate-500">
                Nenhum budget configurado.
              </div>
            ) : (
              summary.budgets.map((budget) => {
                const progress = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
                return (
                  <div
                    key={budget.category}
                    className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm shadow-indigo-500/10"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="uppercase tracking-[0.2em]">{budget.category}</span>
                      <span>
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                      </span>
                    </div>
                    <Progress value={progress} className="mt-2" />
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Ajustar budget</p>
              <p className="text-xs text-slate-500">Atualize limites por categoria.</p>
            </div>
            <Badge variant="default">Mensal</Badge>
          </div>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Categoria</label>
              <select
                value={budgetCategory}
                onChange={(event) => setBudgetCategory(event.target.value)}
                className={inputClass}
              >
                {expenseCategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Limite</label>
              <input
                value={budgetLimit}
                onChange={(event) => setBudgetLimit(event.target.value)}
                className={inputClass}
                placeholder="0,00"
              />
            </div>
            <Button variant="secondary" className="w-full" onClick={handleSaveBudget} disabled={isSubmitting}>
              Atualizar budget
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
