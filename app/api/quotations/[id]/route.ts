import { NextResponse } from "next/server";
import {
  ApiError,
  assertSupabase,
  handleApiError,
  nowIso,
  requireRole,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  booleanValue,
  enumValue,
  finiteNumber,
  hasField,
  hydrateDocuments,
  isoDate,
  readObjectBody,
  requiredText,
  serializedLineItems,
  type JsonRecord,
} from "../../_lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTATION_STATUSES = [
  "Draft",
  "Pending",
  "Approved",
  "Rejected",
] as const;

interface RouteContext {
  params: Promise<{ id: string }>;
}

function sanitizedUpdate(body: JsonRecord): JsonRecord {
  const update: JsonRecord = {};

  if (hasField(body, "clientId")) {
    update.clientId = requiredText(body.clientId, "clientId", 200);
  }
  if (hasField(body, "title")) {
    update.title = requiredText(body.title, "title");
  }
  if (hasField(body, "amount")) {
    update.amount = finiteNumber(body.amount, "amount");
  }
  if (hasField(body, "status")) {
    update.status = enumValue(body.status, "status", QUOTATION_STATUSES);
  }
  if (hasField(body, "validUntil")) {
    update.validUntil = isoDate(body.validUntil, "validUntil");
  }
  if (hasField(body, "items")) {
    update.items = serializedLineItems(body.items);
  }
  if (hasField(body, "vatRate")) {
    update.vatRate = finiteNumber(body.vatRate, "vatRate", 0, 100);
  }
  if (hasField(body, "showVat")) {
    update.showVat = booleanValue(body.showVat, "showVat");
  }

  if (Object.keys(update).length === 0) {
    throw new ApiError("No supported quotation fields were provided");
  }
  update.updatedAt = nowIso();
  return update;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    requireSession(request);
    const { id } = await context.params;
    const quotationId = requiredText(id, "id", 200);
    const update = sanitizedUpdate(await readObjectBody(request));
    const supabase = getSupabaseAdmin();
    const result = await supabase
      .from("Quotation")
      .update(update)
      .eq("id", quotationId)
      .select("*")
      .maybeSingle();
    const row = assertSupabase(result) as JsonRecord | null;
    if (!row) throw new ApiError("Quotation not found", 404);

    const [hydrated] = await hydrateDocuments(supabase, [row]);
    if (!hydrated) throw new ApiError("Quotation not found", 404);
    return NextResponse.json(hydrated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireRole(request, ["super_admin"]);
    const { id } = await context.params;
    const quotationId = requiredText(id, "id", 200);
    const supabase = getSupabaseAdmin();
    const result = await supabase
      .from("Quotation")
      .delete()
      .eq("id", quotationId)
      .select("id")
      .maybeSingle();
    const deleted = assertSupabase(result) as { id: string } | null;
    if (!deleted) throw new ApiError("Quotation not found", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
