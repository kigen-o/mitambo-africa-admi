import "server-only";

import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export type AppRole = "user" | "admin" | "super_admin";

export interface SessionPayload {
  sub: string;
  email: string;
  role: AppRole;
  exp: number;
}

function sessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  if (
    configured &&
    configured.length >= 32 &&
    !/(change|replace|example|your[-_ ]|dev-secret)/i.test(configured)
  ) {
    return configured;
  }
  throw new Error(
    "SESSION_SECRET must be a non-placeholder value containing at least 32 characters.",
  );
}

function signature(payload: string): Buffer {
  return createHmac("sha256", sessionSecret()).update(payload).digest();
}

export function createSessionToken(
  user: Pick<SessionPayload, "sub" | "email" | "role">,
): string {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded).toString("base64url")}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;

  try {
    const supplied = Buffer.from(suppliedSignature, "base64url");
    const expected = signature(encoded);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (
      !payload.sub ||
      !payload.email ||
      !["user", "admin", "super_admin"].includes(payload.role) ||
      !payload.exp ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sessionFromRequest(request: Request): SessionPayload | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return verifySessionToken(authorization.slice(7).trim());
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith("scrypt$")) {
    const supplied = Buffer.from(password);
    const legacy = Buffer.from(stored);
    return supplied.length === legacy.length && timingSafeEqual(supplied, legacy);
  }

  const [, encodedSalt, encodedHash, extra] = stored.split("$");
  if (!encodedSalt || !encodedHash || extra) return false;
  try {
    const salt = Buffer.from(encodedSalt, "base64url");
    const expected = Buffer.from(encodedHash, "base64url");
    const supplied = scryptSync(password, salt, expected.length);
    return timingSafeEqual(supplied, expected);
  } catch {
    return false;
  }
}

export function passwordNeedsUpgrade(stored: string): boolean {
  return !stored.startsWith("scrypt$");
}
