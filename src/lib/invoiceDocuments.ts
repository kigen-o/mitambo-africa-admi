import type { CompanyDetails } from "@/contexts/CompanyContext";
import type { Client, Invoice } from "@/types";
import { formatAmountForCurrency } from "@/lib/currency";
import {
    generatePDF,
    type PDFAction,
    type PDFOptions,
} from "@/lib/pdfGenerator";

export type InvoiceDocumentInvoice = Omit<Invoice, "items"> & {
    items?: Invoice["items"] | string | null;
    paymentDetails?: string | null;
    verificationToken?: string | null;
};

export interface NormalizedInvoiceItem {
    description: string;
    quantity: number;
    price: number;
    total: number;
}

export interface InvoiceAmounts {
    subtotal: number;
    vatAmount: number;
    total: number;
    paid: number;
    balance: number;
}

export interface InvoiceDocumentParams {
    invoice: InvoiceDocumentInvoice;
    companyDetails: CompanyDetails;
    /** Retained for caller compatibility; invoice PDFs use the stored currency snapshot. */
    formatAmount?: (amount: number) => string;
    action?: PDFAction;
    client?: Client;
    /** Override the browser origin for deterministic tests or non-browser callers. */
    origin?: string;
}

type UnknownRecord = Record<string, unknown>;

const roundMoney = (amount: number) => Math.round(amount * 100) / 100;
const verificationTokenPattern = /^[0-9a-f]{32}$/;

function finiteNumber(value: unknown, fallback: number): number {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function rawInvoiceItems(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function normalizeInvoiceItems(
    invoice: InvoiceDocumentInvoice,
): NormalizedInvoiceItem[] {
    const normalized = rawInvoiceItems(invoice.items).flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
        const item = entry as UnknownRecord;
        const description =
            typeof item.description === "string" && item.description.trim()
                ? item.description.trim()
                : invoice.title || "Service/Product";
        const quantity = Math.max(0, finiteNumber(item.quantity, 1));
        const price = Math.max(
            0,
            finiteNumber(item.price ?? item.rate ?? item.amount, 0),
        );
        return [
            {
                description,
                quantity,
                price,
                total: roundMoney(quantity * price),
            },
        ];
    });

    if (normalized.length > 0) return normalized;

    const fallbackPrice = Math.max(0, finiteNumber(invoice.amount, 0));
    return [
        {
            description: invoice.title || "Service/Product",
            quantity: 1,
            price: fallbackPrice,
            total: fallbackPrice,
        },
    ];
}

export function calculateInvoiceAmounts(
    invoice: InvoiceDocumentInvoice,
): InvoiceAmounts {
    const total = Math.max(0, roundMoney(finiteNumber(invoice.amount, 0)));
    const paid = Math.max(0, roundMoney(finiteNumber(invoice.paid, 0)));
    const vatRate = Math.max(0, finiteNumber(invoice.vatRate, 0));
    const showsVat = invoice.showVat !== false && vatRate > 0;
    const subtotal = showsVat
        ? roundMoney(total / (1 + vatRate / 100))
        : total;
    const vatAmount = showsVat ? roundMoney(total - subtotal) : 0;

    return {
        subtotal,
        vatAmount,
        total,
        paid,
        balance: roundMoney(total - paid),
    };
}

export function formatDocumentDate(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Nairobi",
    }).format(date);
}

function browserOrigin(): string | undefined {
    if (typeof window === "undefined" || window.location.origin === "null") {
        return undefined;
    }
    return window.location.origin;
}

export function buildInvoiceVerificationUrl(
    verificationToken: string | null | undefined,
    origin = browserOrigin(),
): string | undefined {
    if (
        !verificationToken ||
        !verificationTokenPattern.test(verificationToken) ||
        !origin
    ) {
        return undefined;
    }
    return new URL(
        `/verify/invoice/${verificationToken}`,
        origin,
    ).toString();
}

function clientDetails(client: Client | undefined): PDFOptions["clientDetails"] {
    if (!client) return undefined;
    return {
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
    };
}

function documentCreator(invoice: InvoiceDocumentInvoice): string | undefined {
    return invoice.user?.profile?.fullName || invoice.user?.email || undefined;
}

export function buildInvoiceDocumentOptions({
    invoice,
    companyDetails,
    action,
    client,
    origin,
}: InvoiceDocumentParams): PDFOptions {
    const items = normalizeInvoiceItems(invoice);
    const amounts = calculateInvoiceAmounts(invoice);
    const vatRate = Math.max(0, finiteNumber(invoice.vatRate, 0));
    const formatInvoiceAmount = (amount: number) =>
        formatAmountForCurrency(amount, invoice.currency);
    const qrUrl = buildInvoiceVerificationUrl(
        invoice.verificationToken,
        origin ?? browserOrigin(),
    );

    return {
        title: "INVOICE",
        subtitle: `Invoice #: ${invoice.id}`,
        metadataLines: [
            `Created: ${formatDocumentDate(invoice.createdAt)}`,
            `Due: ${formatDocumentDate(invoice.dueDate)}`,
            `Status: ${invoice.status}`,
        ],
        filename: `invoice-${invoice.id}`,
        data: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            price: formatInvoiceAmount(item.price),
            total: formatInvoiceAmount(item.total),
        })),
        columns: [
            { header: "Description", dataKey: "description" },
            { header: "Qty", dataKey: "quantity" },
            { header: "Price", dataKey: "price" },
            { header: "Total", dataKey: "total" },
        ],
        companyDetails,
        clientDetails: clientDetails(client ?? invoice.client),
        totals: [
            { label: "Subtotal:", value: formatInvoiceAmount(amounts.subtotal) },
            ...(invoice.showVat !== false && vatRate > 0
                ? [
                    {
                        label: `VAT (${vatRate}%):`,
                        value: formatInvoiceAmount(amounts.vatAmount),
                    },
                ]
                : []),
            { label: "Total:", value: formatInvoiceAmount(amounts.total) },
            { label: "Paid:", value: formatInvoiceAmount(amounts.paid) },
            { label: "Balance:", value: formatInvoiceAmount(amounts.balance) },
        ],
        paymentDetails: invoice.paymentDetails ?? undefined,
        footerNote: "Thank you for your business!",
        action,
        qrUrl,
        qrLabel: qrUrl ? "Scan to verify invoice" : undefined,
        createdBy: documentCreator(invoice),
    };
}

export function buildDeliveryNoteDocumentOptions({
    invoice,
    companyDetails,
    action,
    client,
}: InvoiceDocumentParams): PDFOptions {
    const items = normalizeInvoiceItems(invoice);

    return {
        title: "DELIVERY NOTE",
        subtitle: `Reference invoice #: ${invoice.id}`,
        metadataLines: [
            `Invoice date: ${formatDocumentDate(invoice.createdAt)}`,
        ],
        filename: `delivery-note-${invoice.id}`,
        data: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
        })),
        columns: [
            { header: "Description", dataKey: "description" },
            { header: "Qty", dataKey: "quantity" },
        ],
        companyDetails,
        clientDetails: clientDetails(client ?? invoice.client),
        clientLabel: "DELIVER TO:",
        footerNote: "Please confirm that the items above were received in good order.",
        action,
        signatureFields: [
            { label: "Delivered by" },
            { label: "Received by" },
            { label: "Receiver signature" },
            { label: "Date received" },
        ],
        createdBy: documentCreator(invoice),
    };
}

export async function generateInvoiceDocument(
    params: InvoiceDocumentParams,
): Promise<void> {
    await generatePDF(buildInvoiceDocumentOptions(params));
}

export async function generateDeliveryNoteDocument(
    params: InvoiceDocumentParams,
): Promise<void> {
    await generatePDF(buildDeliveryNoteDocumentOptions(params));
}
