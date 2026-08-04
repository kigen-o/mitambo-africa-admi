import { NextResponse } from "next/server";

import {
  ApiError,
  asRequiredString,
  assertSupabase,
  handleApiError,
  requireRole,
} from "@/lib/api-server";
import { hashPassword, type AppRole } from "@/lib/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  asAppRole,
  createUserRecord,
  type PublicProfile,
} from "../_lib/users";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

export async function GET(request: Request) {
  try {
    requireRole(request, ADMIN_ROLES);
    const supabase = getSupabaseAdmin();
    const users = assertSupabase(
      await supabase
        .from("User")
        .select("id,email,role,createdAt")
        .order("createdAt", { ascending: false }),
    ) ?? [];

    const ids = users.map((user) => String(user.id));
    const profiles = ids.length
      ? assertSupabase(
          await supabase
            .from("Profile")
            .select("id,fullName,avatarUrl")
            .in("id", ids),
        ) ?? []
      : [];
    const profileById = new Map<string, PublicProfile>(
      profiles.map((profile) => [
        String(profile.id),
        {
          id: String(profile.id),
          fullName:
            typeof profile.fullName === "string" ? profile.fullName : null,
          avatarUrl:
            typeof profile.avatarUrl === "string" ? profile.avatarUrl : null,
        },
      ]),
    );

    return NextResponse.json(
      users.map((user) => ({
        id: String(user.id),
        email: String(user.email),
        role: asAppRole(user.role),
        createdAt: String(user.createdAt),
        ...(profileById.has(String(user.id))
          ? { profile: profileById.get(String(user.id)) }
          : {}),
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireRole(request, ADMIN_ROLES);
    const body = (await request.json()) as Record<string, unknown>;
    const email = asRequiredString(body.email, "email").toLowerCase();
    const password = asRequiredString(body.password, "password");
    const fullName =
      body.fullName === undefined || body.fullName === null
        ? null
        : asRequiredString(body.fullName, "fullName");
    const requestedRole = body.role ?? "user";

    if (password.length < 8) {
      throw new ApiError("password must be at least 8 characters");
    }
    if (!['user', 'admin', 'super_admin'].includes(String(requestedRole))) {
      throw new ApiError("role is invalid");
    }

    const role = requestedRole as AppRole;
    if (actor.role !== "super_admin" && role !== "user") {
      throw new ApiError("Only a super administrator can create privileged users", 403);
    }

    const user = await createUserRecord({
      email,
      passwordHash: hashPassword(password),
      role,
      fullName,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
