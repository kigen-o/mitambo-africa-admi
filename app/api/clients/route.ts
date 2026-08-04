import { NextResponse } from "next/server";

import {
  ApiError,
  asRequiredString,
  assertSupabase,
  handleApiError,
  newRecordId,
  nowIso,
  requireRole,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Row = Record<string, unknown>;

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

function groupByClient(rows: Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const clientId = row.clientId;
    if (typeof clientId !== "string") continue;
    const current = grouped.get(clientId) ?? [];
    current.push(row);
    grouped.set(clientId, current);
  }
  return grouped;
}

export async function GET(request: Request) {
  try {
    requireSession(request);
    const supabase = getSupabaseAdmin();
    const clients = (assertSupabase(
      await supabase.from("Client").select("*"),
    ) ?? []) as Row[];

    if (clients.length === 0) return NextResponse.json([]);

    const clientIds = clients
      .map((client) => client.id)
      .filter((id): id is string => typeof id === "string");
    const [invoiceResult, quotationResult] = await Promise.all([
      supabase.from("Invoice").select("*").in("clientId", clientIds),
      supabase.from("Quotation").select("*").in("clientId", clientIds),
    ]);
    const invoicesByClient = groupByClient(
      (assertSupabase(invoiceResult) ?? []) as Row[],
    );
    const quotationsByClient = groupByClient(
      (assertSupabase(quotationResult) ?? []) as Row[],
    );

    return NextResponse.json(
      clients.map((client) => ({
        ...client,
        invoices:
          typeof client.id === "string"
            ? invoicesByClient.get(client.id) ?? []
            : [],
        quotations:
          typeof client.id === "string"
            ? quotationsByClient.get(client.id) ?? []
            : [],
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(request, ADMIN_ROLES);
    const body = (await request.json()) as Record<string, unknown>;
    const timestamp = nowIso();
    const payload = {
      id: newRecordId(),
      name: asRequiredString(body.name, "name"),
      business: optionalText(body, "business") ?? null,
      email: asRequiredString(body.email, "email"),
      phone: optionalText(body, "phone") ?? null,
      address: optionalText(body, "address") ?? null,
      status:
        body.status === undefined
          ? "Active"
          : asRequiredString(body.status, "status"),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const client = assertSupabase(
      await getSupabaseAdmin()
        .from("Client")
        .insert(payload)
        .select("*")
        .single(),
    );
    return NextResponse.json(client);
  } catch (error) {
    return handleApiError(error);
  }
}
