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

function optionalText(
  body: Record<string, unknown>,
  field: string,
): string | null | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new ApiError(`${field} must be a string`);
  return value.trim();
}

function optionalDateIso(value: unknown, field: string): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new ApiError(`${field} must be a date`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(`${field} must be a valid date`);
  return date.toISOString();
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    requireSession(request);
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const payload: Record<string, unknown> = { updatedAt: nowIso() };

    for (const field of ["title", "status", "priority"] as const) {
      if (body[field] !== undefined) {
        payload[field] = asRequiredString(body[field], field);
      }
    }
    for (const field of ["description", "assignedTo", "projectId"] as const) {
      const value = optionalText(body, field);
      if (value !== undefined) payload[field] = value;
    }
    if (body.dueDate !== undefined) {
      payload.dueDate = optionalDateIso(body.dueDate, "dueDate");
    }

    const task = assertSupabase(
      await getSupabaseAdmin()
        .from("Task")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle(),
    );
    if (!task) throw new ApiError("Task not found", 404);
    return NextResponse.json(task);
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
        .from("Task")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle(),
    );
    if (!deleted) throw new ApiError("Task not found", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
