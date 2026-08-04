import "dotenv/config";

import { existsSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { resolve } from "node:path";
import { createClient as createSqliteClient } from "@libsql/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type DataRow = Record<string, unknown>;

const sourcePath = resolve(
  process.env.SQLITE_SOURCE_PATH || "prisma/dev.db",
);
if (!existsSync(sourcePath)) {
  throw new Error(`SQLite source database was not found at ${sourcePath}`);
}

const tableOrder = [
  "User",
  "Profile",
  "Client",
  "Product",
  "Settings",
  "Project",
  "Task",
  "File",
  "Communication",
  "Invoice",
  "Quotation",
  "Expense",
] as const;
type TableName = (typeof tableOrder)[number];

const dateColumns: Partial<Record<TableName, readonly string[]>> = {
  User: ["createdAt", "updatedAt"],
  Client: ["createdAt", "updatedAt"],
  Communication: ["date", "createdAt", "updatedAt"],
  Invoice: ["dueDate", "createdAt", "updatedAt"],
  Product: ["createdAt", "updatedAt"],
  Quotation: ["validUntil", "createdAt", "updatedAt"],
  Project: ["deadline", "createdAt", "updatedAt"],
  Settings: ["updatedAt"],
  Task: ["dueDate", "createdAt", "updatedAt"],
  File: ["createdAt"],
  Expense: ["date", "createdAt", "updatedAt"],
};

function asIsoDate(
  value: unknown,
  table: TableName,
  column: string,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(
    typeof value === "bigint" ? Number(value) : (value as string | number),
  );
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${table}.${column} contains an invalid date`);
  }
  return date.toISOString();
}

function passwordHash(password: string): string {
  if (password.startsWith("scrypt$")) return password;
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

function normalizeRow(table: TableName, source: DataRow): DataRow {
  const row = { ...source };
  for (const column of dateColumns[table] ?? []) {
    row[column] = asIsoDate(row[column], table, column);
  }

  if (table === "User") row.password = passwordHash(String(row.password));
  if (table === "Invoice" || table === "Quotation") {
    row.showVat = Boolean(row.showVat);
  }
  if (table === "Product") row.unit = row.unit || "per project";
  if (table === "Settings" && !("paymentDetails" in row)) {
    row.paymentDetails = null;
  }
  return row;
}

const sqlite = createSqliteClient({ url: `file:${sourcePath}` });

async function sourceRows(table: TableName): Promise<DataRow[]> {
  const result = await sqlite.execute(`SELECT * FROM "${table}"`);
  return result.rows.map((row) =>
    normalizeRow(table, Object.fromEntries(Object.entries(row))),
  );
}

const rowsByTable = new Map<TableName, DataRow[]>();
try {
  for (const table of tableOrder) rowsByTable.set(table, await sourceRows(table));
} finally {
  sqlite.close();
}

console.log(`SQLite source: ${sourcePath}`);
for (const table of tableOrder) {
  console.log(`${table}: ${rowsByTable.get(table)?.length ?? 0} record(s)`);
}

if ((rowsByTable.get("File")?.length ?? 0) > 0) {
  throw new Error(
    "The SQLite database contains File rows. Copy their objects to Supabase Storage before importing metadata.",
  );
}

if (!process.argv.includes("--apply")) {
  console.log(
    "Dry run only. No remote connection was made. Pass --apply with the required destination confirmations to write data.",
  );
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.env.MIGRATION_DESTINATION_PROJECT_REF;
const confirmation = process.env.MIGRATION_CONFIRM;

if (!supabaseUrl || !supabaseSecret) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY before applying data");
}
const actualProjectRef = new URL(supabaseUrl).hostname.split(".")[0];
if (!expectedProjectRef || expectedProjectRef !== actualProjectRef) {
  throw new Error(
    "MIGRATION_DESTINATION_PROJECT_REF must exactly match the Supabase URL project reference",
  );
}
if (confirmation !== "I_UNDERSTAND_THIS_WRITES_REMOTE_DATA") {
  throw new Error(
    "Set MIGRATION_CONFIRM=I_UNDERSTAND_THIS_WRITES_REMOTE_DATA before applying data",
  );
}

const supabase = createSupabaseClient(supabaseUrl, supabaseSecret, {
  db: { schema: "public" },
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

async function remoteCount(table: TableName): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

// This importer is deliberately for an empty destination. It will never merge
// or overwrite business rows already present in Supabase.
for (const table of tableOrder.filter(
  (name) => name !== "User" && name !== "Profile",
)) {
  const count = await remoteCount(table);
  if (count !== 0) {
    throw new Error(
      `Remote ${table} contains ${count} row(s); import aborted without writing`,
    );
  }
}

const { data: remoteUsers, error: remoteUserError } = await supabase
  .from("User")
  .select("id,email,role");
if (remoteUserError) throw remoteUserError;
if ((remoteUsers?.length ?? 0) > 1) {
  throw new Error("Remote User contains more than one row; import aborted without writing");
}
if (remoteUsers?.[0]?.role !== undefined && remoteUsers[0].role !== "super_admin") {
  throw new Error("The existing remote user is not a super administrator; import aborted");
}

const idRemap = new Map<string, string>();
const existingUser = remoteUsers?.[0];
if (existingUser) {
  const sourceMatch = (rowsByTable.get("User") ?? []).find(
    (user) =>
      String(user.email).toLowerCase() ===
      String(existingUser.email).toLowerCase(),
  );
  if (sourceMatch) {
    idRemap.set(String(sourceMatch.id), String(existingUser.id));
    rowsByTable.set(
      "User",
      (rowsByTable.get("User") ?? []).filter(
        (user) => String(user.id) !== String(sourceMatch.id),
      ),
    );
    rowsByTable.set(
      "Profile",
      (rowsByTable.get("Profile") ?? []).filter(
        (profile) => String(profile.id) !== String(sourceMatch.id),
      ),
    );
  }
}

for (const row of rowsByTable.get("Invoice") ?? []) {
  if (typeof row.createdById === "string" && idRemap.has(row.createdById)) {
    row.createdById = idRemap.get(row.createdById);
  }
}
for (const row of rowsByTable.get("Quotation") ?? []) {
  if (typeof row.createdById === "string" && idRemap.has(row.createdById)) {
    row.createdById = idRemap.get(row.createdById);
  }
}
for (const row of rowsByTable.get("Task") ?? []) {
  if (typeof row.assignedTo === "string" && idRemap.has(row.assignedTo)) {
    row.assignedTo = idRemap.get(row.assignedTo);
  }
}

const inserted = new Map<TableName, string[]>();

async function insertTable(table: TableName, rows: DataRow[]) {
  if (rows.length === 0) return;
  for (let start = 0; start < rows.length; start += 250) {
    const batch = rows.slice(start, start + 250);
    const { data, error } = await supabase
      .from(table)
      .insert(batch)
      .select("id");
    if (error) throw error;
    inserted.set(table, [
      ...(inserted.get(table) ?? []),
      ...(data ?? []).map((row) => String(row.id)),
    ]);
  }
}

async function rollbackInsertedRows() {
  for (const table of [...tableOrder].reverse()) {
    const ids = inserted.get(table) ?? [];
    if (ids.length === 0) continue;
    const { error } = await supabase.from(table).delete().in("id", ids);
    if (error) {
      console.error(`Rollback failed for ${table}; manually remove ${ids.length} imported row(s)`);
    }
  }
}

try {
  for (const table of tableOrder) {
    const rows = rowsByTable.get(table) ?? [];
    await insertTable(table, rows);
    console.log(`${table}: inserted ${rows.length}`);
  }
  console.log(`Migration applied to Supabase project ${actualProjectRef}`);
} catch (error) {
  await rollbackInsertedRows();
  throw error;
}
