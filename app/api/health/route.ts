import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json(
    {
      status: "ok",
      deployment: {
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
        url: process.env.VERCEL_URL || null,
        productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
      },
      configured: {
        supabaseUrl: Boolean(supabaseUrl),
        supabaseSecret: Boolean(supabaseSecret),
        sessionSecret: Boolean(process.env.SESSION_SECRET?.trim()),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
