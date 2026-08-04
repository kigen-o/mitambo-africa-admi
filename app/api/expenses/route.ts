import { NextResponse } from "next/server";

import {
  ApiError,
  asNumber,
  asRequiredString,
  assertSupabase,
  handleApiError,
  newRecordId,
  nowIso,
  requireRole,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

function asDateIso(value: unknown, field: string): string {
  const raw = asRequiredString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new ApiError(`${field} must be a valid date`);
  return date.toISOString();
}

export async function GET(request: Request) {
  try {
    requireSession(request);
    const expenses = assertSupabase(
      await getSupabaseAdmin()
        .from("Expense")
        .select("*")
        .order("date", { ascending: false }),
    );
    return NextResponse.json(expenses ?? []);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(request, ADMIN_ROLES);
    const body = (await request.json()) as Record<string, unknown>;
    const timestamp = nowIso();
    const payload = {
      id: newRecordId(),
      date: asDateIso(body.date, "date"),
      description: asRequiredString(body.description, "description"),
      category: asRequiredString(body.category, "category"),
      amount: asNumber(body.amount, "amount"),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const expense = assertSupabase(
      await getSupabaseAdmin()
        .from("Expense")
        .insert(payload)
        .select("*")
        .single(),
    );
    return NextResponse.json(expense);
  } catch (error) {
    return handleApiError(error);
  }
}
