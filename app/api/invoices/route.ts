import { NextResponse } from "next/server";
import {
  assertSupabase,
  handleApiError,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  booleanValue,
  enumValue,
  finiteNumber,
  hydrateDocuments,
  isoDate,
  nextDocumentId,
  readObjectBody,
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

    const invoice: JsonRecord = {
      clientId: requiredText(body.clientId, "clientId", 200),
      title: requiredText(body.title, "title"),
      amount: finiteNumber(body.amount, "amount"),
      paid:
        body.paid === undefined ? 0 : finiteNumber(body.paid, "paid"),
      status:
        body.status === undefined
          ? "Unpaid"
          : enumValue(body.status, "status", INVOICE_STATUSES),
      dueDate: isoDate(body.dueDate, "dueDate"),
      items: serializedLineItems(body.items),
      vatRate:
        body.vatRate === undefined
          ? 0
          : finiteNumber(body.vatRate, "vatRate", 0, 100),
      createdById: session.sub,
      showVat:
        body.showVat === undefined
          ? true
          : booleanValue(body.showVat, "showVat"),
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
