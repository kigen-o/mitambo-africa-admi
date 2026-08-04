import { NextResponse } from "next/server";

import {
  ApiError,
  asNumber,
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

function asInteger(value: unknown, field: string): number {
  const result = asNumber(value, field);
  if (!Number.isInteger(result)) throw new ApiError(`${field} must be an integer`);
  return result;
}

function asDateIso(value: unknown, field: string): string {
  const raw = asRequiredString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new ApiError(`${field} must be a valid date`);
  return date.toISOString();
}

function groupTasks(rows: Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const projectId = row.projectId;
    if (typeof projectId !== "string") continue;
    const current = grouped.get(projectId) ?? [];
    current.push(row);
    grouped.set(projectId, current);
  }
  return grouped;
}

export async function GET(request: Request) {
  try {
    requireSession(request);
    const supabase = getSupabaseAdmin();
    const projects = (assertSupabase(
      await supabase
        .from("Project")
        .select("*")
        .order("createdAt", { ascending: false }),
    ) ?? []) as Row[];
    if (projects.length === 0) return NextResponse.json([]);

    const projectIds = projects
      .map((project) => project.id)
      .filter((id): id is string => typeof id === "string");
    const clientIds = [
      ...new Set(
        projects
          .map((project) => project.clientId)
          .filter((id): id is string => typeof id === "string"),
      ),
    ];
    const [clientResult, taskResult] = await Promise.all([
      supabase.from("Client").select("*").in("id", clientIds),
      supabase.from("Task").select("*").in("projectId", projectIds),
    ]);
    const clients = (assertSupabase(clientResult) ?? []) as Row[];
    const clientById = new Map(
      clients
        .filter((client) => typeof client.id === "string")
        .map((client) => [client.id as string, client]),
    );
    const tasksByProject = groupTasks(
      (assertSupabase(taskResult) ?? []) as Row[],
    );

    return NextResponse.json(
      projects.map((project) => ({
        ...project,
        client:
          typeof project.clientId === "string"
            ? clientById.get(project.clientId) ?? null
            : null,
        tasks:
          typeof project.id === "string"
            ? tasksByProject.get(project.id) ?? []
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
      clientId: asRequiredString(body.clientId, "clientId"),
      stage:
        body.stage === undefined
          ? "Design"
          : asRequiredString(body.stage, "stage"),
      progress:
        body.progress === undefined ? 0 : asInteger(body.progress, "progress"),
      priority:
        body.priority === undefined
          ? "Medium"
          : asRequiredString(body.priority, "priority"),
      deadline: asDateIso(body.deadline, "deadline"),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const project = assertSupabase(
      await getSupabaseAdmin()
        .from("Project")
        .insert(payload)
        .select("*")
        .single(),
    );
    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}
