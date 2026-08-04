import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import {
  ApiError,
  asRequiredString,
  assertSupabase,
  handleApiError,
  nowIso,
} from "@/lib/api-server";
import {
  createSessionToken,
  hashPassword,
  passwordNeedsUpgrade,
  verifyPassword,
} from "@/lib/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  asAppRole,
  createUserRecord,
  findPublicUserById,
} from "../../_lib/users";

export const runtime = "nodejs";

const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_EMAIL_FAILURES = 10;
const MAX_IP_FAILURES = 30;

function requestIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function failureKeys(request: Request, email: string) {
  return [
    createHash("sha256").update(`email:${email}`).digest("hex"),
    createHash("sha256").update(`ip:${requestIp(request)}`).digest("hex"),
  ];
}

async function enforceLoginLimit(request: Request, email: string) {
  const [emailKey, ipKey] = failureKeys(request, email);
  const supabase = getSupabaseAdmin();
  const [emailResult, ipResult] = await Promise.all([
    supabase.rpc("consume_login_attempt", {
      p_key: emailKey,
      p_limit: MAX_EMAIL_FAILURES,
      p_window_seconds: LOGIN_WINDOW_SECONDS,
    }),
    supabase.rpc("consume_login_attempt", {
      p_key: ipKey,
      p_limit: MAX_IP_FAILURES,
      p_window_seconds: LOGIN_WINDOW_SECONDS,
    }),
  ]);
  if (emailResult.error) throw emailResult.error;
  if (ipResult.error) throw ipResult.error;
  if (emailResult.data !== true || ipResult.data !== true) {
    throw new ApiError("Too many login attempts. Try again later.", 429);
  }
}

async function clearLoginFailures(request: Request, email: string) {
  const { error } = await getSupabaseAdmin()
    .from("LoginThrottle")
    .delete()
    .in("key", failureKeys(request, email));
  if (error) throw error;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const suppliedEmail = asRequiredString(body.email, "email");
    const password = asRequiredString(body.password, "password");
    const email = suppliedEmail.toLowerCase();
    await enforceLoginLimit(request, email);
    const supabase = getSupabaseAdmin();

    const user = assertSupabase(
      await supabase
        .from("User")
        .select("id,email,password,role,createdAt")
        .ilike("email", email)
        .limit(1)
        .maybeSingle(),
    );

    if (!user) {
      const { count: userCount, error: countError } = await supabase
        .from("User")
        .select("id", { count: "exact", head: true });
      if (countError) throw countError;

      const bootstrapEmail = process.env.SUPER_ADMIN_EMAIL
        ?.trim()
        .toLowerCase();
      const bootstrapPassword = process.env.SUPER_ADMIN_PASSWORD;
      const mayBootstrap =
        (userCount ?? 0) === 0 &&
        Boolean(bootstrapEmail) &&
        Boolean(bootstrapPassword) &&
        email === bootstrapEmail &&
        password === bootstrapPassword;

      if (!mayBootstrap) {
        throw new ApiError("Invalid credentials", 401);
      }

      const bootstrapped = await createUserRecord({
        email,
        passwordHash: hashPassword(password),
        role: "super_admin",
        fullName: "Super Admin",
      });

      const accessToken = createSessionToken({
        sub: bootstrapped.id,
        email: bootstrapped.email,
        role: bootstrapped.role,
      });
      await clearLoginFailures(request, email);

      return NextResponse.json({
        user: bootstrapped,
        session: { access_token: accessToken },
      });
    }

    if (!verifyPassword(password, String(user.password))) {
      throw new ApiError("Invalid credentials", 401);
    }

    if (passwordNeedsUpgrade(String(user.password))) {
      assertSupabase(
        await supabase
          .from("User")
          .update({ password: hashPassword(password), updatedAt: nowIso() })
          .eq("id", user.id)
          .select("id")
          .single(),
      );
    }

    const publicUser = await findPublicUserById(String(user.id));
    if (!publicUser) throw new ApiError("Invalid credentials", 401);

    const role = asAppRole(user.role);
    const accessToken = createSessionToken({
      sub: publicUser.id,
      email: publicUser.email,
      role,
    });
    await clearLoginFailures(request, email);

    return NextResponse.json({
      user: { ...publicUser, role },
      session: { access_token: accessToken },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
