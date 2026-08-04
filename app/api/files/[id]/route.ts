import { NextResponse } from "next/server";
import {
  ApiError,
  assertSupabase,
  handleApiError,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  ensurePrivateFileBucket,
  FILE_BUCKET,
  validStoredObjectPath,
} from "../../_lib/file-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface StoredFileReference {
  id: string;
  path: string;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireSession(request);
    const { id } = await context.params;
    if (!id || id.length > 200) throw new ApiError("id is required");

    const supabase = getSupabaseAdmin();
    const selected = assertSupabase(
      await supabase
        .from("File")
        .select("id,path")
        .eq("id", id)
        .maybeSingle(),
    ) as StoredFileReference | null;
    if (!selected) throw new ApiError("File not found", 404);

    const path = validStoredObjectPath(selected.path);
    await ensurePrivateFileBucket(supabase);
    const removed = await supabase.storage.from(FILE_BUCKET).remove([path]);
    if (removed.error) throw removed.error;

    const deleted = assertSupabase(
      await supabase
        .from("File")
        .delete()
        .eq("id", selected.id)
        .select("id")
        .maybeSingle(),
    ) as { id: string } | null;
    if (!deleted) throw new ApiError("File not found", 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
