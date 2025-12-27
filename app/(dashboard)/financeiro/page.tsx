"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import { useActiveClinic } from "../../../hooks/useActiveClinic";
import { useFinanceData } from "../../../hooks/useFinanceData";
import { supabase } from "../../../lib/supabase/client";

type EntryType = "receita" | "despesa";

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

export default function FinancePage() {
  const { activeClinic } = useActiveClinic();
  const clinicId = activeClinic?.id;
  const { data, isLoading, error, refresh } = useFinanceData(clinicId);
  const [entryType, setEntryType] = React.useState<EntryType>("despesa");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState(expenseCategories[0]);
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [recurrence, setRecurrence] = React.useState("0");
  const [budgetCategory, setBudgetCategory] = React.useState(
    expenseCategories[0]
  );
  const [budgetLimit, setBudgetLimit] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (entryType === "despesa") {
      setCategory(expenseCategories[0]);
    } else {
      setCategory(revenueCategories[0]);
    }
  }, [entryType]);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR")}`;

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
        };
      }
    );

    if (entryType === "despesa") {
      const { error: insertError } = await supabase
        .from("expenses")
        .insert(
          entries.map((entry) => ({
            clinic_id: entry.clinic_id,
            description: entry.description,
            category: entry.category,
            amount: entry.amount,
            paid_at: entry.paid_at,
          }))
        );
      if (insertError) {
        setIsSubmitting(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("revenue_entries")
        .insert(
          entries.map((entry) => ({
            clinic_id: entry.clinic_id,
            description: entry.description,
            category: entry.category,
            amount: entry.amount,
            received_at: entry.received_at,
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
      },
      { onConflict: "clinic_id,category" }
    );
    setBudgetLimit("");
    await refresh();
    setIsSubmitting(false);
  };

  const handleExport = () => {
    if (!data?.recentEntries) return;
    const rows = [
      ["Tipo", "Descricao", "Categoria", "Origem", "Valor", "Data"],
      ...data.recentEntries.map((entry) => [
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
    anchor.download = "financeiro.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const summary = data ?? {
    totalRevenue: 0,
    totalExpenses: 0,
    balance: 0,
    recentEntries: [],
    budgets: [],
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Financeiro
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Fluxo de caixa
          </h1>
          <p className="text-sm text-slate-500">
            Lancamentos, recorrencias e metas mensais.
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Receitas do mes</p>
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
              <p className="text-xs text-slate-500">Despesas do mes</p>
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
              <p className="text-xs text-slate-500">Saldo</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatCurrency(summary.balance)}
              </p>
            </div>
            <Badge variant={summary.balance >= 0 ? "success" : "danger"}>
              {summary.balance >= 0 ? "Saudavel" : "Ajuste necessario"}
            </Badge>
          </div>
        </Card>
      </section>

      {error ? (
        <Card className="border-rose-200 bg-rose-50/60 text-rose-700">
          {error}
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Lancamentos recentes
              </p>
              <p className="text-xs text-slate-500">
                Receita, despesas e recorrencias.
              </p>
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
                    <p className="text-sm font-medium text-slate-900">
                      {entry.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.category} · {entry.source}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        entry.type === "receita"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }
                    >
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
              <p className="text-sm font-semibold text-slate-900">
                Nova movimentacao
              </p>
              <p className="text-xs text-slate-500">
                Gere lancamentos e recorrencias.
              </p>
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
                className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40"
                placeholder="Ex: Aluguel, Receita premium"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Categoria</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40"
                >
                  {(entryType === "despesa"
                    ? expenseCategories
                    : revenueCategories
                  ).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Valor</label>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40"
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
                  className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Recorrencia</label>
                <select
                  value={recurrence}
                  onChange={(event) => setRecurrence(event.target.value)}
                  className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40"
                >
                  {recurrenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              variant="glow"
              className="w-full"
              onClick={handleCreateEntry}
              disabled={isSubmitting}
            >
              Salvar lancamento
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Budgets</p>
              <p className="text-xs text-slate-500">
                Limites mensais por categoria.
              </p>
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
                const progress =
                  budget.limit > 0
                    ? Math.min((budget.spent / budget.limit) * 100, 100)
                    : 0;
                return (
                  <div
                    key={budget.category}
                    className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm shadow-indigo-500/10"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="uppercase tracking-[0.2em]">
                        {budget.category}
                      </span>
                      <span>
                        {formatCurrency(budget.spent)} /{" "}
                        {formatCurrency(budget.limit)}
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
              <p className="text-sm font-semibold text-slate-900">
                Ajustar budget
              </p>
              <p className="text-xs text-slate-500">
                Atualize limites por categoria.
              </p>
            </div>
            <Badge variant="default">Mensal</Badge>
          </div>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Categoria</label>
              <select
                value={budgetCategory}
                onChange={(event) => setBudgetCategory(event.target.value)}
                className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40"
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
                className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40"
                placeholder="0,00"
              />
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSaveBudget}
              disabled={isSubmitting}
            >
              Atualizar budget
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
