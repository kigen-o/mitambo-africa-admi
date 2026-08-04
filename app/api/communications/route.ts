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

function asDateIso(value: unknown, field: string): string {
  const raw = asRequiredString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new ApiError(`${field} must be a valid date`);
  return date.toISOString();
}

export async function POST(request: Request) {
  try {
    requireSession(request);
    const body = (await request.json()) as Record<string, unknown>;
    const timestamp = nowIso();
    const payload = {
      id: newRecordId(),
      clientId: asRequiredString(body.clientId, "clientId"),
      type: asRequiredString(body.type, "type"),
      subject: asRequiredString(body.subject, "subject"),
      summary: asRequiredString(body.summary, "summary"),
      date: asDateIso(body.date, "date"),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const communication = assertSupabase(
      await getSupabaseAdmin()
        .from("Communication")
        .insert(payload)
        .select("*")
        .single(),
    );
    return NextResponse.json(communication);
  } catch (error) {
    return handleApiError(error);
  }
}
