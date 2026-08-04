import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ApiError,
  assertSupabase,
  normalizeItems,
} from "@/lib/api-server";

export type JsonRecord = Record<string, unknown>;
export type DocumentTable = "Invoice" | "Quotation";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export async function readObjectBody(request: Request): Promise<JsonRecord> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("Request body must be valid JSON");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError("Request body must be a JSON object");
  }
  return body as JsonRecord;
}

export function hasField(body: JsonRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, field);
}

export function requiredText(
  value: unknown,
  field: string,
  maxLength = 500,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(`${field} is required`);
  }

  const text = value.trim();
  if (text.includes("\0")) {
    throw new ApiError(`${field} contains an invalid character`);
  }
  if (text.length > maxLength) {
    throw new ApiError(`${field} must be at most ${maxLength} characters`);
  }
  return text;
}

export function optionalText(
  value: unknown,
  field: string,
  maxLength = 5_000,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ApiError(`${field} must be a string or null`);
  }
  if (!value.trim()) return null;
  return requiredText(value, field, maxLength);
}

export function finiteNumber(
  value: unknown,
  field: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (value === "" || value === null || value === undefined) {
    throw new ApiError(`${field} must be a number`);
  }

  if (typeof value !== "number" && typeof value !== "string") {
    throw new ApiError(`${field} must be a number`);
  }
  const number = typeof value === "number" ? value : Number(value.trim());
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new ApiError(
      `${field} must be a number between ${minimum} and ${maximum}`,
    );
  }
  return number;
}

export function isoDate(value: unknown, field: string): string {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new ApiError(`${field} must be a valid date`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(`${field} must be a valid date`);
  }
  return date.toISOString();
}

export function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ApiError(`${field} must be a boolean`);
  }
  return value;
}

export function enumValue<const T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ApiError(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T[number];
}

export function serializedLineItems(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;

  let candidate: unknown = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      throw new ApiError("items must be a valid JSON array");
    }
  }

  if (!Array.isArray(candidate)) {
    throw new ApiError("items must be an array");
  }
  if (candidate.length > 200) {
    throw new ApiError("items may contain at most 200 entries");
  }

  const items = candidate.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ApiError(`items[${index}] must be an object`);
    }

    const item = entry as JsonRecord;
    const sanitized: JsonRecord = {
      description: requiredText(
        item.description,
        `items[${index}].description`,
        1_000,
      ),
      quantity: finiteNumber(item.quantity, `items[${index}].quantity`, 0.01),
      price: finiteNumber(item.price, `items[${index}].price`),
    };

    if (typeof item.id === "string" && item.id.trim()) {
      sanitized.id = item.id.trim().slice(0, 200);
    }
    return sanitized;
  });

  return JSON.stringify(items);
}

/**
 * Calculates the authoritative document total from validated, serialized line
 * items. Legacy records without line items keep their stored amount.
 */
export function amountFromLineItems(
  serializedItems: unknown,
  vatRate: number,
  showVat: boolean,
  fallbackAmount: number,
): number {
  if (typeof serializedItems !== "string" || !serializedItems.trim()) {
    return roundMoney(fallbackAmount);
  }

  let items: unknown;
  try {
    items = JSON.parse(serializedItems) as unknown;
  } catch {
    return roundMoney(fallbackAmount);
  }
  if (!Array.isArray(items) || items.length === 0) {
    return roundMoney(fallbackAmount);
  }

  const subtotal = items.reduce((sum, entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return sum;
    const item = entry as JsonRecord;
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    return Number.isFinite(quantity) && Number.isFinite(price)
      ? sum + quantity * price
      : sum;
  }, 0);
  const vat = showVat ? subtotal * (vatRate / 100) : 0;
  return finiteNumber(roundMoney(subtotal + vat), "amount");
}

export function reconciledInvoiceStatus(
  requestedStatus: string,
  paid: number,
  amount: number,
): string {
  if (paid > amount) {
    throw new ApiError("paid cannot exceed the invoice amount");
  }
  if (amount > 0 && paid === amount) return "Paid";
  if (paid > 0) return "Partial";
  if (requestedStatus === "Paid" || requestedStatus === "Partial") {
    return "Unpaid";
  }
  return requestedStatus;
}

export async function nextDocumentId(
  supabase: SupabaseClient,
  kind: "invoice" | "quotation",
): Promise<string> {
  const { data, error } = await supabase.rpc("next_document_id", {
    p_kind: kind,
  });
  if (error) throw error;
  if (typeof data !== "string" || !data) {
    throw new Error("Supabase did not return a document ID");
  }
  return data;
}

async function rowsByIds(
  supabase: SupabaseClient,
  table: "Client" | "User" | "Profile",
  columns: string,
  ids: string[],
): Promise<JsonRecord[]> {
  if (ids.length === 0) return [];
  const result = await supabase.from(table).select(columns).in("id", ids);
  return assertSupabase(result) as unknown as JsonRecord[];
}

function uniqueStringValues(rows: JsonRecord[], field: string): string[] {
  return [
    ...new Set(
      rows
        .map((row) => row[field])
        .filter((value): value is string => typeof value === "string" && !!value),
    ),
  ];
}

/**
 * Recreates Prisma's `include: { client: true, user: { include: { profile: true } } }`
 * response while deliberately excluding the User.password column.
 */
export async function hydrateDocuments(
  supabase: SupabaseClient,
  rows: JsonRecord[],
): Promise<JsonRecord[]> {
  if (rows.length === 0) return [];

  const clientIds = uniqueStringValues(rows, "clientId");
  const userIds = uniqueStringValues(rows, "createdById");
  const [clients, users, profiles] = await Promise.all([
    rowsByIds(supabase, "Client", "*", clientIds),
    rowsByIds(supabase, "User", "id,email,role,createdAt,updatedAt", userIds),
    rowsByIds(supabase, "Profile", "id,fullName,avatarUrl", userIds),
  ]);

  const clientsById = new Map(
    clients
      .filter((client) => typeof client.id === "string")
      .map((client) => [client.id as string, client]),
  );
  const profilesById = new Map(
    profiles
      .filter((profile) => typeof profile.id === "string")
      .map((profile) => [profile.id as string, profile]),
  );
  const usersById = new Map(
    users
      .filter((user) => typeof user.id === "string")
      .map((user) => [
        user.id as string,
        {
          ...user,
          profile: profilesById.get(user.id as string) ?? null,
        },
      ]),
  );

  return rows.map((row) => {
    const clientId = typeof row.clientId === "string" ? row.clientId : "";
    const userId =
      typeof row.createdById === "string" ? row.createdById : "";
    return {
      ...normalizeItems(row),
      client: clientsById.get(clientId) ?? null,
      user: usersById.get(userId) ?? null,
    };
  });
}

export async function hydratedDocumentById(
  supabase: SupabaseClient,
  table: DocumentTable,
  id: string,
): Promise<JsonRecord> {
  const result = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  const row = assertSupabase(result) as JsonRecord | null;
  if (!row) throw new ApiError(`${table} not found`, 404);
  const [hydrated] = await hydrateDocuments(supabase, [row]);
  if (!hydrated) throw new ApiError(`${table} not found`, 404);
  return hydrated;
}
