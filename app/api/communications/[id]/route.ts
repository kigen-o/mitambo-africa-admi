import { NextResponse } from "next/server";

import {
  ApiError,
  asRequiredString,
  assertSupabase,
  handleApiError,
  nowIso,
  requireRole,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = { params: Promise<{ id: string }> };

const ADMIN_ROLES = ["admin", "super_admin"] as const;

function asDateIso(value: unknown, field: string): string {
  const raw = asRequiredString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new ApiError(`${field} must be a valid date`);
  return date.toISOString();
}

export async function GET(request: Request, context: RouteContext) {
  try {
    requireSession(request);
    const { id } = await context.params;
    const communication = assertSupabase(
      await getSupabaseAdmin()
        .from("Communication")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
    );
    return NextResponse.json(communication);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    requireSession(request);
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const payload: Record<string, unknown> = { updatedAt: nowIso() };

    for (const field of ["type", "subject", "summary"] as const) {
      if (body[field] !== undefined) {
        payload[field] = asRequiredString(body[field], field);
      }
    }
    if (body.date !== undefined) payload.date = asDateIso(body.date, "date");

    const communication = assertSupabase(
      await getSupabaseAdmin()
        .from("Communication")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle(),
    );
    if (!communication) throw new ApiError("Communication not found", 404);
    return NextResponse.json(communication);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireRole(request, ADMIN_ROLES);
    const { id } = await context.params;
    const deleted = assertSupabase(
      await getSupabaseAdmin()
        .from("Communication")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle(),
    );
    if (!deleted) throw new ApiError("Communication not found", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
