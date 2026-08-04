import { NextResponse } from "next/server";

import {
  ApiError,
  asRequiredString,
  assertSupabase,
  handleApiError,
  nowIso,
  requireSession,
} from "@/lib/api-server";
import { hashPassword } from "@/lib/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { findPublicUserById } from "../../_lib/users";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function canManageUser(
  session: ReturnType<typeof requireSession>,
  userId: string,
): boolean {
  return (
    session.sub === userId ||
    session.role === "admin" ||
    session.role === "super_admin"
  );
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = requireSession(request);
    const { id } = await context.params;
    if (!canManageUser(session, id)) throw new ApiError("Forbidden", 403);

    const user = await findPublicUserById(id);
    if (!user) throw new ApiError("User not found", 404);
    if (session.role === "admin" && user.role === "super_admin") {
      throw new ApiError("Forbidden", 403);
    }

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = requireSession(request);
    const { id } = await context.params;
    if (!canManageUser(session, id)) throw new ApiError("Forbidden", 403);

    const existingUser = await findPublicUserById(id);
    if (!existingUser) throw new ApiError("User not found", 404);
    if (session.role === "admin" && existingUser.role === "super_admin") {
      throw new ApiError("Forbidden", 403);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const userUpdate: Record<string, unknown> = { updatedAt: nowIso() };
    if (body.email !== undefined) {
      userUpdate.email = asRequiredString(body.email, "email").toLowerCase();
    }
    if (body.password !== undefined && body.password !== "") {
      const password = asRequiredString(body.password, "password");
      if (password.length < 8) {
        throw new ApiError("password must be at least 8 characters");
      }
      userUpdate.password = hashPassword(password);
    }

    const supabase = getSupabaseAdmin();
    assertSupabase(
      await supabase
        .from("User")
        .update(userUpdate)
        .eq("id", id)
        .select("id")
        .single(),
    );

    if (body.fullName !== undefined || body.avatarUrl !== undefined) {
      const fullName =
        body.fullName === undefined
          ? existingUser.profile?.fullName ?? null
          : body.fullName === null
            ? null
            : asRequiredString(body.fullName, "fullName");
      const avatarUrl =
        body.avatarUrl === undefined
          ? existingUser.profile?.avatarUrl ?? null
          : body.avatarUrl === null || body.avatarUrl === ""
            ? null
            : asRequiredString(body.avatarUrl, "avatarUrl");

      assertSupabase(
        await supabase
          .from("Profile")
          .upsert({ id, fullName, avatarUrl }, { onConflict: "id" })
          .select("id")
          .single(),
      );
    }

    const updatedUser = await findPublicUserById(id);
    if (!updatedUser) throw new ApiError("User not found", 404);
    return NextResponse.json(updatedUser);
  } catch (error) {
    return handleApiError(error);
  }
}
