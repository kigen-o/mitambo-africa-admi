import { NextResponse } from "next/server";

import {
  ApiError,
  asRequiredString,
  assertSupabase,
  handleApiError,
  newRecordId,
  nowIso,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ApiError(`${field} must be a date`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(`${field} must be a valid date`);
  return date.toISOString();
}

export async function GET(request: Request) {
  try {
    requireSession(request);
    const assignedTo = new URL(request.url).searchParams.get("assignedTo");
    let query = getSupabaseAdmin()
      .from("Task")
      .select("*")
      .order("createdAt", { ascending: false });
    if (assignedTo) query = query.eq("assignedTo", assignedTo);

    return NextResponse.json(assertSupabase(await query) ?? []);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSession(request);
    const body = (await request.json()) as Record<string, unknown>;
    const timestamp = nowIso();
    const payload = {
      id: newRecordId(),
      title: asRequiredString(body.title, "title"),
      description: optionalText(body, "description") ?? null,
      status:
        body.status === undefined
          ? "pending"
          : asRequiredString(body.status, "status"),
      dueDate: optionalDateIso(body.dueDate, "dueDate"),
      priority:
        body.priority === undefined
          ? "Medium"
          : asRequiredString(body.priority, "priority"),
      assignedTo: optionalText(body, "assignedTo") ?? null,
      projectId: optionalText(body, "projectId") ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const task = assertSupabase(
      await getSupabaseAdmin()
        .from("Task")
        .insert(payload)
        .select("*")
        .single(),
    );
    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}
