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

type Row = Record<string, unknown>;
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

export async function GET(request: Request, context: RouteContext) {
  try {
    requireSession(request);
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const client = assertSupabase(
      await supabase.from("Client").select("*").eq("id", id).maybeSingle(),
    ) as Row | null;
    if (!client) throw new ApiError("Client not found", 404);

    const [invoiceResult, quotationResult, projectResult, communicationResult] =
      await Promise.all([
        supabase
          .from("Invoice")
          .select("*")
          .eq("clientId", id)
          .order("createdAt", { ascending: false }),
        supabase
          .from("Quotation")
          .select("*")
          .eq("clientId", id)
          .order("createdAt", { ascending: false }),
        supabase
          .from("Project")
          .select("*")
          .eq("clientId", id)
          .order("createdAt", { ascending: false }),
        supabase
          .from("Communication")
          .select("*")
          .eq("clientId", id)
          .order("date", { ascending: false }),
      ]);

    return NextResponse.json({
      ...client,
      invoices: assertSupabase(invoiceResult) ?? [],
      quotations: assertSupabase(quotationResult) ?? [],
      projects: assertSupabase(projectResult) ?? [],
      communications: assertSupabase(communicationResult) ?? [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    requireRole(request, ADMIN_ROLES);
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const payload: Record<string, unknown> = { updatedAt: nowIso() };

    if (body.name !== undefined) payload.name = asRequiredString(body.name, "name");
    if (body.email !== undefined) {
      payload.email = asRequiredString(body.email, "email");
    }
    if (body.status !== undefined) {
      payload.status = asRequiredString(body.status, "status");
    }
    for (const field of ["business", "phone", "address"] as const) {
      const value = optionalText(body, field);
      if (value !== undefined) payload[field] = value;
    }

    const client = assertSupabase(
      await getSupabaseAdmin()
        .from("Client")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle(),
    );
    if (!client) throw new ApiError("Client not found", 404);
    return NextResponse.json(client);
  } catch (error) {
    return handleApiError(error);
  }
}
