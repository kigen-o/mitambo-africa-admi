import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ApiError,
  assertSupabase,
  handleApiError,
  newRecordId,
  nowIso,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  ensurePrivateFileBucket,
  FILE_BUCKET,
  sanitizedContentType,
  sanitizedFileName,
  sanitizedTaskId,
  storageObjectPath,
  validateFiles,
} from "../_lib/file-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StoredFileRow {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  createdAt: string;
  taskId: string | null;
}

export async function GET(request: Request) {
  try {
    requireSession(request);
    const supabase = getSupabaseAdmin();
    const files = assertSupabase(
      await supabase
        .from("File")
        .select("id,name,path,size,type,createdAt,taskId")
        .order("createdAt", { ascending: false }),
    ) as StoredFileRow[];
    return NextResponse.json(files);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const uploadedPaths: string[] = [];
  const insertedIds: string[] = [];
  let supabase: SupabaseClient | undefined;

  try {
    const session = requireSession(request);
    supabase = getSupabaseAdmin();
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ApiError("Request body must be multipart form data");
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => typeof entry !== "string");
    validateFiles(files);
    const taskId = sanitizedTaskId(formData.get("taskId"));
    await ensurePrivateFileBucket(supabase);

    const savedFiles: StoredFileRow[] = [];
    for (const file of files) {
      const name = sanitizedFileName(file.name);
      const type = sanitizedContentType(file.type);
      const path = storageObjectPath(session.sub, name);
      const uploaded = await supabase.storage.from(FILE_BUCKET).upload(
        path,
        await file.arrayBuffer(),
        {
          cacheControl: "3600",
          contentType: type,
          upsert: false,
        },
      );
      if (uploaded.error) throw uploaded.error;
      uploadedPaths.push(path);

      const row: StoredFileRow = {
        id: newRecordId(),
        name,
        path,
        size: file.size,
        type,
        createdAt: nowIso(),
        taskId,
      };
      const inserted = assertSupabase(
        await supabase.from("File").insert(row).select("*").single(),
      ) as StoredFileRow;
      insertedIds.push(inserted.id);
      savedFiles.push(inserted);
    }

    return NextResponse.json(savedFiles);
  } catch (error) {
    // Storage and Postgres cannot share a transaction. Roll back every object
    // and metadata row created during this request when any upload fails.
    if (supabase && insertedIds.length > 0) {
      const rollback = await supabase.from("File").delete().in("id", insertedIds);
      if (rollback.error) console.error("Failed to roll back file metadata", rollback.error);
    }
    if (supabase && uploadedPaths.length > 0) {
      const rollback = await supabase.storage.from(FILE_BUCKET).remove(uploadedPaths);
      if (rollback.error) console.error("Failed to roll back uploaded objects", rollback.error);
    }
    return handleApiError(error);
  }
}
