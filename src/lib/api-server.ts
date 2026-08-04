import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  sessionFromRequest,
  type AppRole,
  type SessionPayload,
} from "@/lib/server-auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export function requireSession(request: Request): SessionPayload {
  const session = sessionFromRequest(request);
  if (!session) throw new ApiError("Unauthorized", 401);
  return session;
}

export function requireRole(
  request: Request,
  roles: readonly AppRole[],
): SessionPayload {
  const session = requireSession(request);
  if (!roles.includes(session.role)) throw new ApiError("Forbidden", 403);
  return session;
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const candidate = error as { message?: string; code?: string };
  const duplicate = candidate?.code === "23505";
  const foreignKey = candidate?.code === "23503";
  const status = duplicate || foreignKey ? 409 : 500;
  const message = duplicate
    ? "A record with those details already exists"
    : foreignKey
      ? "This record is still referenced by other data"
      : candidate?.message || "Internal server error";

  console.error("API request failed", error);
  return NextResponse.json({ error: message }, { status });
}

export function assertSupabase<T>(result: {
  data: T;
  error: { message: string; code?: string } | null;
}): T {
  if (result.error) throw result.error;
  return result.data;
}

export function newRecordId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function asRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(`${field} is required`);
  }
  return value.trim();
}

export function asNumber(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new ApiError(`${field} must be a number`);
  return parsed;
}

export function normalizeItems<T extends Record<string, unknown>>(row: T): T {
  if (typeof row.items !== "string") return row;
  try {
    return { ...row, items: JSON.parse(row.items) };
  } catch {
    return { ...row, items: [] };
  }
}

export function serializeItems(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}
