import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  assertSupabase,
  handleApiError,
  requireSession,
} from "@/lib/api-server";
import { currencyCodes } from "@/lib/currency";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  amountFromLineItems,
  booleanValue,
  enumValue,
  finiteNumber,
  hydrateDocuments,
  isoDate,
  nextDocumentId,
  optionalText,
  readObjectBody,
  reconciledInvoiceStatus,
  requiredText,
  serializedLineItems,
  type JsonRecord,
} from "../_lib/documents";

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

export async function GET(request: Request) {
  try {
    requireSession(request);
    const supabase = getSupabaseAdmin();
    const rows = assertSupabase(
      await supabase.from("Invoice").select("*"),
    ) as JsonRecord[];
    return NextResponse.json(await hydrateDocuments(supabase, rows));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = requireSession(request);
    const body = await readObjectBody(request);
    const supabase = getSupabaseAdmin();
    const createdAt = new Date();
    const timestamp = createdAt.toISOString();
    const isAdmin =
      session.role === "admin" || session.role === "super_admin";
    const hasPaymentDetails = Object.prototype.hasOwnProperty.call(
      body,
      "paymentDetails",
    );
    let paymentDetails: string | null;
    if (isAdmin && hasPaymentDetails) {
      paymentDetails = optionalText(body.paymentDetails, "paymentDetails");
    } else {
      const settings = assertSupabase(
        await supabase
          .from("Settings")
          .select("paymentDetails")
          .order("updatedAt", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
      paymentDetails = optionalText(
        settings?.paymentDetails,
        "paymentDetails",
      );
    }

    const items = serializedLineItems(body.items);
    const vatRate =
      body.vatRate === undefined
        ? 0
        : finiteNumber(body.vatRate, "vatRate", 0, 100);
    const showVat =
      body.showVat === undefined
        ? true
        : booleanValue(body.showVat, "showVat");
    const suppliedAmount = finiteNumber(body.amount, "amount");
    const amount = amountFromLineItems(
      items,
      vatRate,
      showVat,
      suppliedAmount,
    );
    const paid =
      body.paid === undefined ? 0 : finiteNumber(body.paid, "paid");
    const requestedStatus =
      body.status === undefined
        ? "Unpaid"
        : enumValue(body.status, "status", INVOICE_STATUSES);

    const invoice: JsonRecord = {
      verificationToken: randomUUID().replaceAll("-", ""),
      clientId: requiredText(body.clientId, "clientId", 200),
      title: requiredText(body.title, "title"),
      amount,
      paid,
      currency:
        body.currency === undefined
          ? "KES"
          : enumValue(body.currency, "currency", currencyCodes),
      paymentDetails,
      status: reconciledInvoiceStatus(requestedStatus, paid, amount),
      dueDate: isoDate(body.dueDate, "dueDate"),
      items,
      vatRate,
      createdById: session.sub,
      showVat,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // The legacy UI displays date-based invoice IDs. A retry covers the rare
    // case where two requests calculate the same daily sequence concurrently.
    let inserted: JsonRecord | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      invoice.id = await nextDocumentId(supabase, "invoice");
      const result = await supabase
        .from("Invoice")
        .insert(invoice)
        .select("*")
        .single();

      if (!result.error) {
        inserted = result.data as JsonRecord;
        break;
      }
      if (result.error.code !== "23505" || attempt === 2) throw result.error;
    }

    if (!inserted) throw new Error("Invoice could not be created");
    const [hydrated] = await hydrateDocuments(supabase, [inserted]);
    if (!hydrated) throw new Error("Invoice could not be loaded");
    return NextResponse.json(hydrated);
  } catch (error) {
    return handleApiError(error);
  }
}
