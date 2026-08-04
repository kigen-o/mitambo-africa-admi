import { NextResponse } from "next/server";
import {
  ApiError,
  assertSupabase,
  handleApiError,
  nowIso,
  requireRole,
  requireSession,
} from "@/lib/api-server";
import { currencyCodes } from "@/lib/currency";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  amountFromLineItems,
  booleanValue,
  enumValue,
  finiteNumber,
  hasField,
  hydrateDocuments,
  isoDate,
  optionalText,
  readObjectBody,
  reconciledInvoiceStatus,
  requiredText,
  serializedLineItems,
  type JsonRecord,
} from "../../_lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVOICE_STATUSES = [
  "Paid",
  "Partial",
  "Unpaid",
  "Overdue",
  "Draft",
  "Pending",
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
  if (hasField(body, "paid")) {
    update.paid = finiteNumber(body.paid, "paid");
  }
  if (hasField(body, "currency")) {
    update.currency = enumValue(body.currency, "currency", currencyCodes);
  }
  if (hasField(body, "paymentDetails")) {
    update.paymentDetails = optionalText(body.paymentDetails, "paymentDetails");
  }
  if (hasField(body, "status")) {
    update.status = enumValue(body.status, "status", INVOICE_STATUSES);
  }
  if (hasField(body, "dueDate")) {
    update.dueDate = isoDate(body.dueDate, "dueDate");
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
    throw new ApiError("No supported invoice fields were provided");
  }
  update.updatedAt = nowIso();
  return update;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = requireSession(request);
    const body = await readObjectBody(request);
    const isAdmin =
      session.role === "admin" || session.role === "super_admin";
    if (hasField(body, "paymentDetails") && !isAdmin) {
      throw new ApiError(
        "Only administrators can update invoice payment details",
        403,
      );
    }
    const { id } = await context.params;
    const invoiceId = requiredText(id, "id", 200);
    const update = sanitizedUpdate(body);
    const supabase = getSupabaseAdmin();
    const existing = assertSupabase(
      await supabase
        .from("Invoice")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle(),
    ) as JsonRecord | null;
    if (!existing) throw new ApiError("Invoice not found", 404);

    const items = hasField(update, "items") ? update.items : existing.items;
    const vatRate = finiteNumber(
      hasField(update, "vatRate") ? update.vatRate : existing.vatRate ?? 0,
      "vatRate",
      0,
      100,
    );
    const showVat = hasField(update, "showVat")
      ? Boolean(update.showVat)
      : existing.showVat !== false;
    const fallbackAmount = finiteNumber(
      hasField(update, "amount") ? update.amount : existing.amount,
      "amount",
    );
    const amount = amountFromLineItems(
      items,
      vatRate,
      showVat,
      fallbackAmount,
    );
    const paid = finiteNumber(
      hasField(update, "paid") ? update.paid : existing.paid ?? 0,
      "paid",
    );
    const requestedStatus = String(
      hasField(update, "status") ? update.status : existing.status ?? "Unpaid",
    );
    update.amount = amount;
    update.paid = paid;
    update.status = reconciledInvoiceStatus(requestedStatus, paid, amount);

    const result = await supabase
      .from("Invoice")
      .update(update)
      .eq("id", invoiceId)
      .select("*")
      .maybeSingle();
    const row = assertSupabase(result) as JsonRecord | null;
    if (!row) throw new ApiError("Invoice not found", 404);

    const [hydrated] = await hydrateDocuments(supabase, [row]);
    if (!hydrated) throw new ApiError("Invoice not found", 404);
    return NextResponse.json(hydrated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireRole(request, ["super_admin"]);
    const { id } = await context.params;
    const invoiceId = requiredText(id, "id", 200);
    const supabase = getSupabaseAdmin();
    const result = await supabase
      .from("Invoice")
      .delete()
      .eq("id", invoiceId)
      .select("id")
      .maybeSingle();
    const deleted = assertSupabase(result) as { id: string } | null;
    if (!deleted) throw new ApiError("Invoice not found", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
