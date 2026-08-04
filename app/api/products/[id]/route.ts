import { NextResponse } from "next/server";

import {
  ApiError,
  assertSupabase,
  handleApiError,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireSession(request);
    const { id } = await context.params;
    const deleted = assertSupabase(
      await getSupabaseAdmin()
        .from("Product")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle(),
    );
    if (!deleted) throw new ApiError("Product not found", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
