import "server-only";

import type { AppRole } from "@/lib/server-auth";
import {
  ApiError,
  assertSupabase,
  newRecordId,
  nowIso,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface PublicProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface PublicUser {
  id: string;
  email: string;
  role: AppRole;
  createdAt: string;
  profile?: PublicProfile;
}

export function asAppRole(value: unknown): AppRole {
  return value === "admin" || value === "super_admin" ? value : "user";
}

export async function findPublicUserById(
  id: string,
): Promise<PublicUser | null> {
  const supabase = getSupabaseAdmin();
  const user = assertSupabase(
    await supabase
      .from("User")
      .select("id,email,role,createdAt")
      .eq("id", id)
      .maybeSingle(),
  );
  if (!user) return null;

  const profile = assertSupabase(
    await supabase
      .from("Profile")
      .select("id,fullName,avatarUrl")
      .eq("id", id)
      .maybeSingle(),
  );

  return {
    id: String(user.id),
    email: String(user.email),
    role: asAppRole(user.role),
    createdAt: String(user.createdAt),
    ...(profile
      ? {
          profile: {
            id: String(profile.id),
            fullName:
              typeof profile.fullName === "string" ? profile.fullName : null,
            avatarUrl:
              typeof profile.avatarUrl === "string" ? profile.avatarUrl : null,
          },
        }
      : {}),
  };
}

export async function createUserRecord(input: {
  email: string;
  passwordHash: string;
  role: AppRole;
  fullName?: string | null;
  avatarUrl?: string | null;
}): Promise<PublicUser> {
  const supabase = getSupabaseAdmin();
  const id = newRecordId();
  const timestamp = nowIso();

  const user = assertSupabase(
    await supabase
      .from("User")
      .insert({
        id,
        email: input.email,
        password: input.passwordHash,
        role: input.role,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .select("id,email,role,createdAt")
      .single(),
  );
  if (!user) throw new ApiError("Failed to create user", 500);

  const profileResult = await supabase
    .from("Profile")
    .insert({
      id,
      fullName: input.fullName ?? null,
      avatarUrl: input.avatarUrl ?? null,
    })
    .select("id,fullName,avatarUrl")
    .single();

  if (profileResult.error) {
    const rollback = await supabase.from("User").delete().eq("id", id);
    if (rollback.error) {
      console.error("Failed to roll back user after profile creation failed", {
        userId: id,
        error: rollback.error,
      });
    }
    throw profileResult.error;
  }

  const profile = profileResult.data;
  return {
    id: String(user.id),
    email: String(user.email),
    role: asAppRole(user.role),
    createdAt: String(user.createdAt),
    profile: {
      id: String(profile.id),
      fullName: typeof profile.fullName === "string" ? profile.fullName : null,
      avatarUrl:
        typeof profile.avatarUrl === "string" ? profile.avatarUrl : null,
    },
  };
}
