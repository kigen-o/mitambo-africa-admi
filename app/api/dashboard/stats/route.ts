import { NextResponse } from "next/server";

import {
  assertSupabase,
  handleApiError,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PAGE_SIZE = 1000;

async function allRows(
  table: "Invoice" | "Expense",
  columns: string,
): Promise<Record<string, unknown>[]> {
  const supabase = getSupabaseAdmin();
  const rows: Record<string, unknown>[] = [];

  for (let start = 0; ; start += PAGE_SIZE) {
    const page = (assertSupabase(
      await supabase
        .from(table)
        .select(columns)
        .range(start, start + PAGE_SIZE - 1),
    ) ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function GET(request: Request) {
  try {
    requireSession(request);
    const supabase = getSupabaseAdmin();
    const [clientsResult, invoicesResult, productsResult, pendingResult, invoices, expenses] =
      await Promise.all([
        supabase.from("Client").select("id", { count: "exact", head: true }),
        supabase.from("Invoice").select("id", { count: "exact", head: true }),
        supabase.from("Product").select("id", { count: "exact", head: true }),
        supabase
          .from("Quotation")
          .select("id", { count: "exact", head: true })
          .eq("status", "Pending"),
        allRows("Invoice", "paid,amount,status"),
        allRows("Expense", "amount"),
      ]);

    const clients = assertSupabase({
      data: clientsResult.count ?? 0,
      error: clientsResult.error,
    });
    const invoiceCount = assertSupabase({
      data: invoicesResult.count ?? 0,
      error: invoicesResult.error,
    });
    const products = assertSupabase({
      data: productsResult.count ?? 0,
      error: productsResult.error,
    });
    const pendingQuotations = assertSupabase({
      data: pendingResult.count ?? 0,
      error: pendingResult.error,
    });
    const revenue = invoices.reduce(
      (sum, invoice) => sum + (Number(invoice.paid) || 0),
      0,
    );
    const expenseTotal = expenses.reduce(
      (sum, expense) => sum + (Number(expense.amount) || 0),
      0,
    );
    const unpaidAmount = invoices.reduce(
      (sum, invoice) =>
        invoice.status === "Unpaid"
          ? sum + (Number(invoice.amount) || 0)
          : sum,
      0,
    );

    return NextResponse.json({
      clients,
      invoices: invoiceCount,
      products,
      revenue,
      expenses: expenseTotal,
      netIncome: revenue - expenseTotal,
      unpaidAmount,
      pendingQuotations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
