"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldCheck, ShieldX } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatAmountForCurrency,
  type CurrencyCode,
} from "@/lib/currency";

interface VerificationData {
  verified: true;
  invoice: {
    number: string;
    title: string;
    createdAt: string;
    dueDate: string;
    status: string;
    amount: number;
    paid: number;
    balance: number;
    currency: CurrencyCode;
    vatRate: number;
    showVat: boolean;
    items: Array<{ description: string; quantity: number; price: number }>;
    paymentDetails: string | null;
  };
  client: {
    name: string;
    business: string | null;
  };
  company: {
    name: string;
    subtitle: string | null;
    logo: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat("en-KE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
}

export default function InvoiceVerification() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !/^[0-9a-f]{32}$/i.test(token)) {
      setError("This invoice verification link is invalid.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/public/invoices/${encodeURIComponent(token)}`, {
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    })
      .then(async (result) => {
        const body = (await result.json().catch(() => null)) as
          | VerificationData
          | { verified?: false; error?: string }
          | null;
        if (!result.ok || !body || body.verified !== true) {
          throw new Error(
            body && "error" in body && body.error
              ? body.error
              : "This invoice could not be verified.",
          );
        }
        setData(body);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "This invoice could not be verified.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          Verifying invoice…
        </div>
      </main>
    );
  }

  if (!data || error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-lg border-destructive/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <ShieldX className="h-14 w-14 text-destructive" />
            <div>
              <h1 className="text-2xl font-bold">Invoice not verified</h1>
              <p className="mt-2 text-muted-foreground">
                {error ?? "This invoice verification link is invalid."}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { company, client, invoice } = data;
  const contactDetails = [company.address, company.phone, company.email, company.website].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="overflow-hidden">
          <div className="border-b bg-emerald-50 px-6 py-4 text-emerald-800">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-7 w-7" />
              <div>
                <h1 className="text-xl font-bold">Verified invoice</h1>
                <p className="text-sm text-emerald-700">
                  This information matches the live issuer record.
                </p>
              </div>
            </div>
          </div>

          <CardHeader className="gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={`${company.name} logo`}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 rounded-lg border bg-white object-contain p-1"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-2xl">{company.name}</CardTitle>
                {company.subtitle && (
                  <p className="mt-1 text-sm text-muted-foreground">{company.subtitle}</p>
                )}
                {contactDetails.length > 0 && (
                  <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                    {contactDetails.map((value) => (
                      <p key={value}>{value}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-muted px-4 py-3 text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Invoice number
              </p>
              <p className="mt-1 font-mono text-lg font-bold">{invoice.number}</p>
              <span className="mt-2 inline-flex rounded-full bg-background px-2.5 py-1 text-xs font-semibold">
                {invoice.status}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-7">
            <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Client</p>
                <p className="mt-1 font-semibold">{client.name}</p>
                {client.business && <p className="text-sm text-muted-foreground">{client.business}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Invoice date</p>
                <p className="mt-1 font-semibold">{formatDate(invoice.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Due date</p>
                <p className="mt-1 font-semibold">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            <section>
              <h2 className="text-lg font-semibold">{invoice.title}</h2>
              <div className="mt-3 overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-muted/70 text-left">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                      <th className="px-4 py-3 text-right font-semibold">Unit price</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.length > 0 ? (
                      invoice.items.map((item, index) => (
                        <tr key={`${item.description}-${index}`} className="border-t">
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="px-4 py-3 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">
                            {formatAmountForCurrency(item.price, invoice.currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatAmountForCurrency(
                              item.quantity * item.price,
                              invoice.currency,
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t">
                        <td className="px-4 py-4 text-muted-foreground" colSpan={4}>
                          No line-item details are available for this invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                {invoice.paymentDetails && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <h2 className="font-semibold">Payment details</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {invoice.paymentDetails}
                    </p>
                  </div>
                )}
              </div>
              <dl className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Invoice amount</dt>
                  <dd className="font-semibold">
                    {formatAmountForCurrency(invoice.amount, invoice.currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Amount paid</dt>
                  <dd className="font-semibold text-emerald-700">
                    {formatAmountForCurrency(invoice.paid, invoice.currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t pt-3 text-lg">
                  <dt className="font-semibold">Balance</dt>
                  <dd className="font-bold">
                    {formatAmountForCurrency(invoice.balance, invoice.currency)}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
