import { NextResponse } from "next/server";

import {
  asNumber,
  asRequiredString,
  assertSupabase,
  handleApiError,
  newRecordId,
  nowIso,
  requireSession,
} from "@/lib/api-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    requireSession(request);
    const products = assertSupabase(
      await getSupabaseAdmin()
        .from("Product")
        .select(
          "id,name,description,price,stock,category,unit,createdAt,updatedAt",
        )
        .order("createdAt", { ascending: false }),
    ) ?? [];
    return NextResponse.json(products);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSession(request);
    const body = (await request.json()) as Record<string, unknown>;
    const timestamp = nowIso();
    const product = assertSupabase(
      await getSupabaseAdmin()
        .from("Product")
        .insert({
          id: newRecordId(),
          name: asRequiredString(body.name, "name"),
          description:
            body.description === undefined || body.description === null
              ? null
              : String(body.description),
          price: asNumber(body.price, "price"),
          stock:
            body.stock === undefined ? 0 : asNumber(body.stock, "stock"),
          category:
            body.category === undefined || body.category === null
              ? null
              : asRequiredString(body.category, "category"),
          unit:
            body.unit === undefined
              ? "per project"
              : asRequiredString(body.unit, "unit"),
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .select(
          "id,name,description,price,stock,category,unit,createdAt,updatedAt",
        )
        .single(),
    );
    if (!product) {
      throw new Error("Supabase did not return the created product");
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
