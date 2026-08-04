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

const MAX_LOGO_BYTES = Math.floor(1.5 * 1024 * 1024);

const TEXT_LIMITS = {
  companyName: 160,
  companyEmail: 254,
  companyPhone: 64,
  companyAddress: 1000,
  companyWebsite: 2048,
  companySubtitle: 240,
  paymentDetails: 5000,
} as const;

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

type EditableField = (typeof EDITABLE_FIELDS)[number];
type TextField = keyof typeof TEXT_LIMITS;

function validateTextField(
  field: TextField,
  value: unknown,
): string | null {
  if (value === null) {
    if (field === "companyName") {
      throw new ApiError("companyName cannot be null");
    }
    return null;
  }
  if (typeof value !== "string") {
    throw new ApiError(`${field} must be a string or null`);
  }

  const normalized = value.trim();
  if (field === "companyName" && !normalized) {
    throw new ApiError("companyName is required");
  }
  if (normalized.length > TEXT_LIMITS[field]) {
    throw new ApiError(
      `${field} must be at most ${TEXT_LIMITS[field]} characters`,
    );
  }
  if (
    field === "companyEmail" &&
    normalized &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new ApiError("companyEmail must be a valid email address");
  }
  if (field === "companyWebsite" && normalized) {
    try {
      const url = new URL(
        /^https?:\/\//i.test(normalized)
          ? normalized
          : `https://${normalized}`,
      );
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Unsupported protocol");
      }
    } catch {
      throw new ApiError("companyWebsite must be a valid web address");
    }
  }

  return normalized;
}

function hasExpectedImageSignature(mimeType: string, bytes: Buffer): boolean {
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )
    );
  }
  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }
  return (
    mimeType === "image/webp" &&
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function validateLogo(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new ApiError("companyLogo must be an image data URI or null");
  }

  const match = value.match(
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match) {
    throw new ApiError("companyLogo must be a PNG, JPEG, or WebP data URI");
  }

  const [, mimeType, encoded] = match;
  if (encoded.length % 4 !== 0) {
    throw new ApiError("companyLogo contains invalid base64 data");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.length > MAX_LOGO_BYTES) {
    throw new ApiError("companyLogo must not exceed 1.5 MB", 413);
  }
  if (!hasExpectedImageSignature(mimeType, bytes)) {
    throw new ApiError("companyLogo content does not match its image type");
  }

  return value;
}

function validatedSetting(field: EditableField, value: unknown) {
  return field === "companyLogo"
    ? validateLogo(value)
    : validateTextField(field, value);
}

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
    requireRole(request, ["admin", "super_admin"]);
    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      throw new ApiError("Request body must be valid JSON");
    }
    if (
      !parsedBody ||
      typeof parsedBody !== "object" ||
      Array.isArray(parsedBody)
    ) {
      throw new ApiError("Request body must be a JSON object");
    }
    const body = parsedBody as Record<string, unknown>;
    const editableFields = new Set<string>(EDITABLE_FIELDS);
    const unsupportedField = Object.keys(body).find(
      (field) => !editableFields.has(field),
    );
    if (unsupportedField) {
      throw new ApiError(`${unsupportedField} is not an editable setting`);
    }

    const update: Record<string, string | null> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = body[field];
      if (value === undefined) continue;
      update[field] = validatedSetting(field, value);
    }
    if (Object.keys(update).length === 0) {
      throw new ApiError("At least one editable setting is required");
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
