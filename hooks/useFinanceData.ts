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

type FinanceSummary = {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  recentEntries: FinanceEntry[];
  budgets: BudgetUsage[];
};

type UseFinanceDataResult = {
  data: FinanceSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useFinanceData(clinicId?: string): UseFinanceDataResult {
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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [expensesRes, revenuesRes, paymentsRes, budgetsRes] =
      await Promise.all([
        supabase
          .from("expenses")
          .select("id, description, category, amount, paid_at, vendor")
          .eq("clinic_id", clinicId)
          .order("paid_at", { ascending: false })
          .limit(120),
        supabase
          .from("revenue_entries")
          .select("id, description, category, amount, received_at")
          .eq("clinic_id", clinicId)
          .order("received_at", { ascending: false })
          .limit(120),
        supabase
          .from("payments")
          .select("id, amount, method, paid_at")
          .eq("clinic_id", clinicId)
          .order("paid_at", { ascending: false })
          .limit(120),
        supabase
          .from("budgets")
          .select("id, category, monthly_limit")
          .eq("clinic_id", clinicId)
          .order("category", { ascending: true }),
      ]);

    if (
      expensesRes.error ||
      revenuesRes.error ||
      paymentsRes.error ||
      budgetsRes.error
    ) {
      setError("Falha ao carregar dados financeiros.");
      setIsLoading(false);
      return;
    }

    const expenses = expensesRes.data ?? [];
    const revenues = revenuesRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const budgets = budgetsRes.data ?? [];

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

    const sorted = entries.sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    );

    const totalRevenue = entries
      .filter(
        (entry) =>
          entry.type === "receita" &&
          new Date(entry.paidAt) >= monthStart
      )
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalExpenses = entries
      .filter(
        (entry) =>
          entry.type === "despesa" &&
          new Date(entry.paidAt) >= monthStart
      )
      .reduce((sum, entry) => sum + entry.amount, 0);

    const budgetUsage = budgets.map((budget) => {
      const spent = entries
        .filter(
          (entry) =>
            entry.type === "despesa" &&
            entry.category === budget.category &&
            new Date(entry.paidAt) >= monthStart
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
      recentEntries: sorted.slice(0, 30),
      budgets: budgetUsage,
    });
    setIsLoading(false);
  }, [clinicId]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}
