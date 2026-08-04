import { NextResponse } from "next/server";

import {
  ApiError,
  asRequiredString,
  handleApiError,
} from "@/lib/api-server";
import { hashPassword } from "@/lib/server-auth";
import { createUserRecord } from "../../_lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (process.env.ALLOW_PUBLIC_SIGNUP !== "true") {
      throw new ApiError("Public signup is disabled", 403);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const email = asRequiredString(body.email, "email").toLowerCase();
    const password = asRequiredString(body.password, "password");
    const fullName =
      body.fullName === undefined || body.fullName === null
        ? null
        : asRequiredString(body.fullName, "fullName");

    if (password.length < 8) {
      throw new ApiError("password must be at least 8 characters");
    }

    const configuredSuperAdmin = process.env.SUPER_ADMIN_EMAIL;
    if (
      configuredSuperAdmin &&
      email === configuredSuperAdmin.trim().toLowerCase()
    ) {
      throw new ApiError(
        "This email is reserved for the configured super administrator",
        403,
      );
    }

    const user = await createUserRecord({
      email,
      passwordHash: hashPassword(password),
      role: "user",
      fullName,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
