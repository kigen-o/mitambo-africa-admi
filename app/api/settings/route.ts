import { NextResponse } from "next/server";

import {
  ApiError,
  assertSupabase,
  handleApiError,
  newRecordId,
  nowIso,
  requireRole,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SETTINGS_COLUMNS =
  "id,companyName,companyEmail,companyPhone,companyAddress,companyLogo,companyWebsite,companySubtitle,paymentDetails,updatedAt";

const EDITABLE_FIELDS = [
  "companyName",
  "companyEmail",
  "companyPhone",
  "companyAddress",
  "companyLogo",
  "companyWebsite",
  "companySubtitle",
  "paymentDetails",
] as const;

export async function GET(request: Request) {
  try {
    requireSession(request);
    const settings = assertSupabase(
      await getSupabaseAdmin()
        .from("Settings")
        .select(SETTINGS_COLUMNS)
        .order("updatedAt", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    return NextResponse.json(settings ?? {});
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(request, ["super_admin"]);
    const body = (await request.json()) as Record<string, unknown>;
    const update: Record<string, string | null> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = body[field];
      if (value === undefined) continue;
      if (value !== null && typeof value !== "string") {
        throw new ApiError(`${field} must be a string or null`);
      }
      update[field] = value as string | null;
    }

    const supabase = getSupabaseAdmin();
    const existing = assertSupabase(
      await supabase
        .from("Settings")
        .select("id")
        .order("updatedAt", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    const timestamp = nowIso();
    const settings = existing
      ? assertSupabase(
          await supabase
            .from("Settings")
            .update({ ...update, updatedAt: timestamp })
            .eq("id", existing.id)
            .select(SETTINGS_COLUMNS)
            .single(),
        )
      : assertSupabase(
          await supabase
            .from("Settings")
            .insert({ id: newRecordId(), ...update, updatedAt: timestamp })
            .select(SETTINGS_COLUMNS)
            .single(),
        );

    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
