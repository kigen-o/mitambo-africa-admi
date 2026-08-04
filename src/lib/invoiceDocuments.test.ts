import { describe, expect, it } from "vitest";

import type { CompanyDetails } from "@/contexts/CompanyContext";
import type { Client } from "@/types";
import {
    buildDeliveryNoteDocumentOptions,
    buildInvoiceDocumentOptions,
    buildInvoiceVerificationUrl,
    calculateInvoiceAmounts,
    normalizeInvoiceItems,
    type InvoiceDocumentInvoice,
} from "@/lib/invoiceDocuments";

const companyDetails: CompanyDetails = {
    name: "Mitambo Africa",
    subtitle: "Agency Suite",
    address: "Nairobi",
    phone: "+254700000000",
    email: "hello@example.com",
    website: "example.com",
    logo: null,
    paymentDetails: "Paybill: 123456\nAccount: INV-NUMBER",
};

const client: Client = {
    id: "client-1",
    name: "Example Client",
    email: "client@example.com",
    phone: "+254711111111",
    address: "Westlands",
    status: "Active",
    createdAt: "2026-01-01T00:00:00.000Z",
};

const invoice: InvoiceDocumentInvoice = {
    id: "I-D2026AU04-01",
    clientId: client.id,
    client,
    title: "Printed banners",
    amount: 116,
    paid: 20,
    currency: "USD",
    status: "Partial",
    dueDate: "2026-08-14T10:00:00.000Z",
    createdAt: "2026-08-04T10:00:00.000Z",
    vatRate: 16,
    showVat: true,
    items: JSON.stringify([
        { description: "Banner", quantity: "2", rate: "50" },
    ]),
    verificationToken: "0123456789abcdef0123456789abcdef",
    paymentDetails: "Bank: Example Bank",
};

const formatAmount = (amount: number) => `KES ${amount.toFixed(2)}`;

describe("invoice document builders", () => {
    it("normalizes legacy serialized line items without mutating invoice data", () => {
        expect(normalizeInvoiceItems(invoice)).toEqual([
            {
                description: "Banner",
                quantity: 2,
                price: 50,
                total: 100,
            },
        ]);
        expect(typeof invoice.items).toBe("string");
    });

    it("calculates totals from the persisted invoice amount", () => {
        expect(calculateInvoiceAmounts(invoice)).toEqual({
            subtotal: 100,
            vatAmount: 16,
            total: 116,
            paid: 20,
            balance: 96,
        });
    });

    it("builds an invoice with creation metadata, payment details, and verification QR", () => {
        const options = buildInvoiceDocumentOptions({
            invoice,
            companyDetails,
            formatAmount,
            action: "preview",
            origin: "https://admin.example.com",
        });

        expect(options.subtitle).toBe(`Invoice #: ${invoice.id}`);
        expect(options.metadataLines).toEqual([
            "Created: 04 Aug 2026",
            "Due: 14 Aug 2026",
            "Status: Partial",
        ]);
        expect(options.paymentDetails).toBe("Bank: Example Bank");
        expect(options.qrUrl).toBe(
            `https://admin.example.com/verify/invoice/${invoice.verificationToken}`,
        );
        expect(options.qrLabel).toBe("Scan to verify invoice");
        expect(options.totals).toEqual([
            { label: "Subtotal:", value: "$100" },
            { label: "VAT (16%):", value: "$16" },
            { label: "Total:", value: "$116" },
            { label: "Paid:", value: "$20" },
            { label: "Balance:", value: "$96" },
        ]);

        const fallbackOptions = buildInvoiceDocumentOptions({
            invoice: { ...invoice, paymentDetails: null },
            companyDetails,
            formatAmount,
            origin: "https://admin.example.com",
        });
        expect(fallbackOptions.paymentDetails).toBeUndefined();
    });

    it("does not build verification URLs for malformed tokens", () => {
        expect(
            buildInvoiceVerificationUrl(
                "token/with spaces",
                "https://admin.example.com",
            ),
        ).toBeUndefined();
        expect(
            buildInvoiceVerificationUrl(
                "0123456789ABCDEF0123456789ABCDEF",
                "https://admin.example.com",
            ),
        ).toBeUndefined();
    });

    it("builds a delivery note without prices, payment details, totals, or QR data", () => {
        const options = buildDeliveryNoteDocumentOptions({
            invoice,
            companyDetails,
            formatAmount,
            action: "download",
        });

        expect(options.title).toBe("DELIVERY NOTE");
        expect(options.subtitle).toBe(`Reference invoice #: ${invoice.id}`);
        expect(options.metadataLines).toEqual(["Invoice date: 04 Aug 2026"]);
        expect(options.clientLabel).toBe("DELIVER TO:");
        expect(options.columns).toEqual([
            { header: "Description", dataKey: "description" },
            { header: "Qty", dataKey: "quantity" },
        ]);
        expect(options.data).toEqual([
            { description: "Banner", quantity: 2 },
        ]);
        expect(options.totals).toBeUndefined();
        expect(options.paymentDetails).toBeUndefined();
        expect(options.qrUrl).toBeUndefined();
        expect(options.signatureFields).toHaveLength(4);
    });
});
