import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCurrencyCode } from "@/lib/currency";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ token: string }>;
}

type JsonRecord = Record<string, unknown>;

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function finiteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function publicItems(value: unknown) {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return [];
    }
  }

  if (!Array.isArray(candidate)) return [];
  return candidate
    .filter(
      (item): item is JsonRecord =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .map((item) => ({
      description: optionalString(item.description) ?? "Item",
      quantity: finiteNumber(item.quantity),
      price: finiteNumber(item.price),
    }));
}

export async function GET(_request: Request, context: RouteContext) {
  const { token: suppliedToken } = await context.params;
  if (!/^[0-9a-f]{32}$/i.test(suppliedToken)) {
    return response(
      { verified: false, error: "This invoice verification link is invalid." },
      404,
    );
  }

  const token = suppliedToken.toLowerCase();
  try {
    const supabase = getSupabaseAdmin();
    const invoiceResult = await supabase
      .from("Invoice")
      .select(
        "id,clientId,title,amount,paid,currency,status,dueDate,createdAt,items,vatRate,showVat,paymentDetails",
      )
      .eq("verificationToken", token)
      .maybeSingle();

    if (invoiceResult.error) throw invoiceResult.error;
    if (!invoiceResult.data) {
      return response(
        { verified: false, error: "This invoice could not be verified." },
        404,
      );
    }

    const invoice = invoiceResult.data;
    const [clientResult, settingsResult] = await Promise.all([
      supabase
        .from("Client")
        .select("name,business")
        .eq("id", invoice.clientId)
        .maybeSingle(),
      supabase
        .from("Settings")
        .select(
          "companyName,companyEmail,companyPhone,companyAddress,companyLogo,companyWebsite,companySubtitle",
        )
        .order("updatedAt", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (clientResult.error) throw clientResult.error;
    if (settingsResult.error) throw settingsResult.error;

    const amount = finiteNumber(invoice.amount);
    const paid = finiteNumber(invoice.paid);
    const settings = settingsResult.data;

    return response({
      verified: true,
      invoice: {
        number: String(invoice.id),
        title: String(invoice.title),
        createdAt: String(invoice.createdAt),
        dueDate: String(invoice.dueDate),
        status: String(invoice.status),
        amount,
        paid,
        currency: normalizeCurrencyCode(invoice.currency),
        balance: Number((amount - paid).toFixed(2)),
        vatRate: finiteNumber(invoice.vatRate),
        showVat: Boolean(invoice.showVat),
        items: publicItems(invoice.items),
        paymentDetails: optionalString(invoice.paymentDetails),
      },
      client: {
        name: optionalString(clientResult.data?.name) ?? "Client",
        business: optionalString(clientResult.data?.business),
      },
      company: {
        name: optionalString(settings?.companyName) ?? "Mitambo Africa",
        subtitle: optionalString(settings?.companySubtitle),
        logo: optionalString(settings?.companyLogo),
        address: optionalString(settings?.companyAddress),
        phone: optionalString(settings?.companyPhone),
        email: optionalString(settings?.companyEmail),
        website: optionalString(settings?.companyWebsite),
      },
    });
  } catch (error) {
    console.error("Public invoice verification failed", error);
    return response(
      {
        verified: false,
        error: "Invoice verification is temporarily unavailable.",
      },
      500,
    );
  }
}
