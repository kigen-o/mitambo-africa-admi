import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { toast } from "sonner";

// Colors
const COLOR_PRIMARY = [22, 104, 53] as [number, number, number]; // Brand Green (#166835)
const COLOR_SECONDARY = [100, 116, 139] as [number, number, number]; // Slate 500
const COLOR_TEXT = [15, 23, 42] as [number, number, number]; // Slate 900

interface PDFOptions {
    title: string;
    subtitle?: string;
    filename: string;
    data: Record<string, unknown>[];
    columns: { header: string; dataKey: string }[];
    companyDetails: {
        name: string;
        subtitle?: string;
        address: string;
        phone: string;
        email: string;
        website?: string;
        logo?: string | null;
    };
    clientDetails?: {
        name: string;
        email: string;
        phone: string;
        address?: string;
    };
    totals?: { label: string; value: string | number }[];
    footerNote?: string;
    action?: 'download' | 'preview' | 'print' | 'email';
    qrUrl?: string; // Add QR code URL
    createdBy?: string;
}

const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = reject;
        img.src = base64;
    });
};

export const generatePDF = async ({
    title,
    subtitle,
    filename,
    data,
    columns,
    companyDetails,
    clientDetails,
    totals,
    footerNote,
    action = 'download',
    qrUrl,
    createdBy
}: PDFOptions) => {
    const doc = new jsPDF();

    // Moving Header Background and logo logic together to handle dynamic height
    let hasLogo = false;
    let logoHeight = 0;
    let finalWidth = 0;
    let finalHeight = 0;
    let jsPDFFormat = 'PNG';

    // Company Logo (Calculate dimensions first if logo exists)
    if (companyDetails.logo && companyDetails.logo.startsWith('data:image/')) {
        try {
            const format = companyDetails.logo.split(';')[0].split('/')[1].toUpperCase();
            jsPDFFormat = format === 'SVG+XML' ? 'SVG' : format === 'JPG' ? 'JPEG' : format;
            const dimensions = await getImageDimensions(companyDetails.logo);
            const maxWidth = 40;
            const ratio = dimensions.height / dimensions.width;
            const logoWidth = Math.min(maxWidth, dimensions.width / 3.78);
            finalWidth = logoWidth > maxWidth ? maxWidth : logoWidth;
            finalHeight = finalWidth * ratio;

            hasLogo = true;
            logoHeight = finalHeight;
        } catch (e) {
            console.error("Failed to calculate logo dimensions", e);
        }
    }

    // Header Background
    const headerBgHeight = Math.max(40, hasLogo ? 10 + logoHeight + 15 : 40);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, headerBgHeight, "F");

    let logoDrawn = false;

    // Add Logo if exists (now that background is drawn)
    if (hasLogo) {
        try {
            doc.addImage(companyDetails.logo!, jsPDFFormat, 14, 10, finalWidth, finalHeight);
            logoDrawn = true;
        } catch (e) {
            // Fallback
            try {
                doc.addImage(companyDetails.logo!, 14, 10, 20, 20);
                logoHeight = 20;
                logoDrawn = true;
            } catch (e2) {
                console.error("Fallback addImage failed", e2);
            }
        }
    }

    if (!logoDrawn) {
        // Company Name
        doc.setFontSize(22);
        doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
        doc.setFont("helvetica", "bold");
        doc.text(companyDetails.name, 14, 18);

        // Company Subtitle (Tagline)
        if (companyDetails.subtitle) {
            doc.setFontSize(10);
            doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
            doc.setFont("helvetica", "normal");
            doc.text(companyDetails.subtitle, 14, 24);
        }
    } else {
        // Company Tagline below logo
        doc.setFontSize(10);
        doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
        doc.setFont("helvetica", "normal");
        if (companyDetails.subtitle) {
            doc.text(companyDetails.subtitle, 14, 10 + logoHeight + 5);
        }
    }

    // Company Contact Info (Right aligned in a Box)
    // Draw a light background box for the contact info
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.roundedRect(130, 10, 70, 35, 3, 3, "F");

    doc.setFontSize(9);
    doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
    // Align text inside the box (x = 130 + 65 = 195 for right align with padding)
    const boxRightX = 195;
    let boxY = 18;

    doc.text(companyDetails.address, boxRightX, boxY, { align: "right" });
    boxY += 5;
    doc.text(companyDetails.phone, boxRightX, boxY, { align: "right" });
    boxY += 5;
    doc.text(companyDetails.email, boxRightX, boxY, { align: "right" });
    if (companyDetails.website) {
        boxY += 5;
        doc.text(companyDetails.website, boxRightX, boxY, { align: "right" });
    }

    // QR Code
    if (qrUrl) {
        try {
            const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 100 });
            doc.addImage(qrDataUrl, "PNG", 170, 35, 26, 26);
        } catch (e) {
            console.error("Failed to add QR code", e);
        }
    }

    // Document Title
    let yPos = Math.max(55, headerBgHeight + 10);
    doc.setFontSize(18);
    doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), 14, yPos);

    if (subtitle) {
        yPos += 7;
        doc.setFontSize(11);
        doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
        doc.setFont("helvetica", "normal");
        doc.text(subtitle, 14, yPos);
    }

    // Client Details Section
    if (clientDetails) {
        yPos += 15;

        // Label
        doc.setFontSize(10);
        doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
        doc.text("BILL TO:", 14, yPos);

        yPos += 6;
        doc.setFontSize(11);
        doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
        doc.setFont("helvetica", "bold");
        doc.text(clientDetails.name, 14, yPos);

        yPos += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(clientDetails.email, 14, yPos);

        yPos += 5;
        doc.text(clientDetails.phone, 14, yPos);

        if (clientDetails.address) {
            yPos += 5;
            doc.text(clientDetails.address, 14, yPos);
        }

        // Move Y down for table
        yPos += 15;
    } else {
        yPos += 15;
    }

    // Table
    autoTable(doc, {
        startY: yPos,
        head: [columns.map(c => c.header)],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: data.map(row => columns.map(c => row[c.dataKey])) as any[][],
        theme: 'grid',
        headStyles: {
            fillColor: COLOR_PRIMARY,
            textColor: 255,
            fontStyle: 'bold',
            halign: 'left'
        },
        styles: {
            fontSize: 10,
            cellPadding: 3,
            textColor: COLOR_TEXT,
            valign: 'middle'
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        }
    });

    // Totals Section
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    if (totals) {
        let currentY = finalY;
        totals.forEach(total => {
            doc.setFontSize(10);
            doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
            doc.text(total.label, 140, currentY);

            doc.setFont("helvetica", "bold");
            doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
            doc.text(String(total.value), 196, currentY, { align: "right" });

            currentY += 7;
        });
    }

    // Footer / Divider
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(226, 232, 240); // Border color
    doc.line(14, pageHeight - 20, 196, pageHeight - 20);

    doc.setFontSize(9);
    doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
    doc.setFont("helvetica", "normal");

    if (footerNote) {
        doc.text(footerNote, 14, pageHeight - 12);
    } else {
        doc.text(`Generated by ${companyDetails.name}`, 14, pageHeight - 12);
    }

    if (createdBy) {
        doc.setFontSize(8);
        doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
        doc.setFont("helvetica", "italic");
        doc.text(`Generated by: ${createdBy}`, 196, pageHeight - 15, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.text(`Page 1 of 1`, 196, pageHeight - 10, { align: "right" });
    } else {
        doc.text(`Page 1 of 1`, 196, pageHeight - 15, { align: "right" });
    }

    // Output logic
    if (action === 'preview' || action === 'print') {
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);

        const previewWindow = window.open(blobUrl, '_blank');

        if (!previewWindow) {
            toast.error('Please allow popups to preview PDFs');
            URL.revokeObjectURL(blobUrl);
            return;
        }

        // Set the title of the new window
        previewWindow.document.title = `${title} - ${filename}`;

        if (action === 'print') {
            previewWindow.onload = () => {
                previewWindow.print();
            };
        }

        // Cleanup after a delay to ensure PDF is loaded completely in the new tab
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
        // Robust sanitization: remove any existing .pdf extension and illegal characters
        const sanitizedBase = filename
            .replace(/\.(pdf|PDF)$/i, '')
            .replace(/[/\\?%*:|"<> ]/g, '_');

        const finalFilename = `${sanitizedBase}.pdf`;

        doc.save(finalFilename);
    }
};

export const generateInvoicesSummary = async (
    invoices: any[],
    companyDetails: any,
    formatAmount: (amount: number) => string
) => {
    const data = invoices.map(inv => ({
        id: inv.id,
        client: inv.client?.name || 'Unknown',
        amount: formatAmount(inv.amount),
        paid: formatAmount(inv.paid),
        status: inv.status,
        date: new Date(inv.createdAt).toLocaleDateString()
    }));

    const totals = [
        { label: 'Total Invoiced:', value: formatAmount(invoices.reduce((sum, inv) => sum + inv.amount, 0)) },
        { label: 'Total Paid:', value: formatAmount(invoices.reduce((sum, inv) => sum + inv.paid, 0)) },
        { label: 'Outstanding:', value: formatAmount(invoices.reduce((sum, inv) => sum + (inv.amount - inv.paid), 0)) }
    ];

    await generatePDF({
        title: 'Invoices Report',
        subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        filename: `invoices-report-${new Date().getTime()}`,
        data,
        columns: [
            { header: 'ID', dataKey: 'id' },
            { header: 'Client', dataKey: 'client' },
            { header: 'Amount', dataKey: 'amount' },
            { header: 'Paid', dataKey: 'paid' },
            { header: 'Status', dataKey: 'status' },
            { header: 'Date', dataKey: 'date' }
        ],
        companyDetails,
        totals,
        footerNote: "Confidential Business Report"
    });
};
