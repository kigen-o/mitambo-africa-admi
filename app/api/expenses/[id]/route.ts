import { NextResponse } from "next/server";

import {
  ApiError,
  assertSupabase,
  handleApiError,
  requireRole,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = { params: Promise<{ id: string }> };

const ADMIN_ROLES = ["admin", "super_admin"] as const;

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireRole(request, ADMIN_ROLES);
    const { id } = await context.params;
    const deleted = assertSupabase(
      await getSupabaseAdmin()
        .from("Expense")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle(),
    );
    if (!deleted) throw new ApiError("Expense not found", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
