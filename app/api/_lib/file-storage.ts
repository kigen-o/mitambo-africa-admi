import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, newRecordId } from "@/lib/api-server";

export const FILE_BUCKET = "task-files";
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 10;

let bucketReady: Promise<void> | undefined;

async function prepareBucket(supabase: SupabaseClient): Promise<void> {
  const existing = await supabase.storage.getBucket(FILE_BUCKET);
  if (existing.data) {
    if (existing.data.public) {
      const updated = await supabase.storage.updateBucket(FILE_BUCKET, {
        public: false,
        fileSizeLimit: MAX_UPLOAD_BYTES,
      });
      if (updated.error) throw updated.error;
    }
    return;
  }

  const created = await supabase.storage.createBucket(FILE_BUCKET, {
    public: false,
    fileSizeLimit: MAX_UPLOAD_BYTES,
  });
  if (created.error) {
    // Another cold function may have created the bucket concurrently.
    const retry = await supabase.storage.getBucket(FILE_BUCKET);
    if (retry.error || !retry.data) throw created.error;
    if (retry.data.public) {
      throw new Error(`${FILE_BUCKET} must be a private storage bucket`);
    }
  }
}

export async function ensurePrivateFileBucket(
  supabase: SupabaseClient,
): Promise<void> {
  bucketReady ??= prepareBucket(supabase);
  try {
    await bucketReady;
  } catch (error) {
    bucketReady = undefined;
    throw error;
  }
}

export function sanitizedTaskId(value: FormDataEntryValue | null): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new ApiError("taskId must be text");

  const taskId = value.trim();
  if (!taskId) return null;
  if (taskId.includes("\0")) {
    throw new ApiError("taskId contains an invalid character");
  }
  if (taskId.length > 200) {
    throw new ApiError("taskId must be at most 200 characters");
  }
  return taskId;
}

function withoutControlCharacters(value: string): string {
  return [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
}

export function sanitizedFileName(value: string): string {
  const name = value
    .split(/[\\/]/)
    .pop()
    ?.trim();
  const cleanName = name ? withoutControlCharacters(name).trim() : "";
  if (!cleanName) throw new ApiError("Every uploaded file must have a name");
  return cleanName.slice(0, 255);
}

export function sanitizedContentType(value: string): string {
  const type = withoutControlCharacters(value).trim();
  return (type || "application/octet-stream").slice(0, 255);
}

export function storageObjectPath(userId: string, fileName: string): string {
  const safeName = fileName
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-180) || "file";
  return `${userId}/${newRecordId()}-${safeName}`;
}

export function validateFiles(files: File[]): void {
  if (files.length === 0) throw new ApiError("No files uploaded");
  if (files.length > MAX_FILES_PER_REQUEST) {
    throw new ApiError(
      `At most ${MAX_FILES_PER_REQUEST} files can be uploaded at once`,
    );
  }

  let totalBytes = 0;
  for (const file of files) {
    if (file.size <= 0) throw new ApiError(`${file.name || "File"} is empty`);
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError(`${file.name} exceeds the 4 MB upload limit`, 413);
    }
    totalBytes += file.size;
  }
  if (totalBytes > MAX_UPLOAD_BYTES) {
    throw new ApiError("The combined upload exceeds the 4 MB limit", 413);
  }
}

export function validStoredObjectPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new ApiError("File storage path is invalid", 409);
  }
  return value;
}
