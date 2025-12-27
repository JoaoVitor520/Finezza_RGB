"use client";

import * as React from "react";
import { supabase } from "../lib/supabase/client";

type FinanceEntry = {
  id: string;
  type: "receita" | "despesa";
  description: string;
  category: string | null;
  amount: number;
  paidAt: string;
  source: string;
};

type BudgetUsage = {
  category: string;
  limit: number;
  spent: number;
};

type MonthlyPoint = {
  month: string;
  revenue: number;
  expenses: number;
  balance: number;
};

type CategoryTotal = {
  category: string;
  total: number;
};

type FinanceSummary = {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  averageMonthly: number;
  entries: FinanceEntry[];
  recentEntries: FinanceEntry[];
  budgets: BudgetUsage[];
  monthlySeries: MonthlyPoint[];
  expenseCategories: CategoryTotal[];
  revenueCategories: CategoryTotal[];
};

type DateRange = {
  from?: string;
  to?: string;
};

type UseFinanceDataResult = {
  data: FinanceSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const toStartDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toEndDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-01`;

const groupByCategory = (entries: FinanceEntry[], type: "receita" | "despesa") => {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.type !== type) continue;
    const key = entry.category ?? "outros";
    totals.set(key, (totals.get(key) ?? 0) + entry.amount);
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
};

export function useFinanceData(
  clinicId?: string,
  range?: DateRange
): UseFinanceDataResult {
  const [data, setData] = React.useState<FinanceSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!clinicId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const now = new Date();
    const rangeFrom = toStartDate(range?.from) ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const rangeTo = toEndDate(range?.to) ?? now;

    if (rangeFrom > rangeTo) {
      setError("Intervalo invalido.");
      setIsLoading(false);
      return;
    }

    let expensesQuery = supabase
      .from("expenses")
      .select("id, description, category, amount, paid_at, vendor")
      .eq("clinic_id", clinicId)
      .order("paid_at", { ascending: false })
      .limit(240);

    let revenuesQuery = supabase
      .from("revenue_entries")
      .select("id, description, category, amount, received_at")
      .eq("clinic_id", clinicId)
      .order("received_at", { ascending: false })
      .limit(240);

    let paymentsQuery = supabase
      .from("payments")
      .select("id, amount, method, paid_at")
      .eq("clinic_id", clinicId)
      .order("paid_at", { ascending: false })
      .limit(240);

    expensesQuery = expensesQuery
      .gte("paid_at", rangeFrom.toISOString())
      .lte("paid_at", rangeTo.toISOString());
    revenuesQuery = revenuesQuery
      .gte("received_at", rangeFrom.toISOString())
      .lte("received_at", rangeTo.toISOString());
    paymentsQuery = paymentsQuery
      .gte("paid_at", rangeFrom.toISOString())
      .lte("paid_at", rangeTo.toISOString());

    const [expensesRes, revenuesRes, paymentsRes, budgetsRes, monthlyRes] =
      await Promise.all([
        expensesQuery,
        revenuesQuery,
        paymentsQuery,
        supabase
          .from("budgets")
          .select("id, category, monthly_limit")
          .eq("clinic_id", clinicId)
          .order("category", { ascending: true }),
        supabase
          .from("v_finance_monthly")
          .select("month, revenue, expenses")
          .eq("clinic_id", clinicId)
          .gte("month", toMonthKey(rangeFrom))
          .lte("month", toMonthKey(rangeTo))
          .order("month", { ascending: true }),
      ]);

    if (
      expensesRes.error ||
      revenuesRes.error ||
      paymentsRes.error ||
      budgetsRes.error ||
      monthlyRes.error
    ) {
      setError("Falha ao carregar dados financeiros.");
      setIsLoading(false);
      return;
    }

    const expenses = expensesRes.data ?? [];
    const revenues = revenuesRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const budgets = budgetsRes.data ?? [];
    const monthly = monthlyRes.data ?? [];

    const entries: FinanceEntry[] = [
      ...expenses.map((expense) => ({
        id: expense.id,
        type: "despesa" as const,
        description: expense.description,
        category: expense.category ?? "operacional",
        amount: Number(expense.amount ?? 0),
        paidAt: expense.paid_at,
        source: expense.vendor ?? "Despesa",
      })),
      ...revenues.map((revenue) => ({
        id: revenue.id,
        type: "receita" as const,
        description: revenue.description,
        category: revenue.category ?? "servicos",
        amount: Number(revenue.amount ?? 0),
        paidAt: revenue.received_at,
        source: "Receita manual",
      })),
      ...payments.map((payment) => ({
        id: payment.id,
        type: "receita" as const,
        description: `Pagamento ${payment.method ?? ""}`.trim(),
        category: "consultas",
        amount: Number(payment.amount ?? 0),
        paidAt: payment.paid_at,
        source: "Pagamento",
      })),
    ].filter((entry) => Boolean(entry.paidAt));

    const sortedEntries = entries.sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    );

    const totalRevenue = entries
      .filter((entry) => entry.type === "receita")
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalExpenses = entries
      .filter((entry) => entry.type === "despesa")
      .reduce((sum, entry) => sum + entry.amount, 0);

    const monthsCount =
      (rangeTo.getFullYear() - rangeFrom.getFullYear()) * 12 +
      (rangeTo.getMonth() - rangeFrom.getMonth()) +
      1;

    const monthlySeries = (monthly as { month: string; revenue: number; expenses: number }[]).map(
      (point) => ({
        month: point.month,
        revenue: Number(point.revenue ?? 0),
        expenses: Number(point.expenses ?? 0),
        balance: Number(point.revenue ?? 0) - Number(point.expenses ?? 0),
      })
    );

    const budgetUsage = budgets.map((budget) => {
      const spent = entries
        .filter(
          (entry) =>
            entry.type === "despesa" && entry.category === budget.category
        )
        .reduce((sum, entry) => sum + entry.amount, 0);
      return {
        category: budget.category,
        limit: Number(budget.monthly_limit ?? 0),
        spent,
      };
    });

    setData({
      totalRevenue,
      totalExpenses,
      balance: totalRevenue - totalExpenses,
      averageMonthly: monthsCount > 0 ? totalRevenue / monthsCount : totalRevenue,
      entries: sortedEntries,
      recentEntries: sortedEntries.slice(0, 40),
      budgets: budgetUsage,
      monthlySeries,
      expenseCategories: groupByCategory(entries, "despesa"),
      revenueCategories: groupByCategory(entries, "receita"),
    });
    setIsLoading(false);
  }, [clinicId, range?.from, range?.to]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}
