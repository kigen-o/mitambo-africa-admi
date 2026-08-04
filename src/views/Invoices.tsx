import { useState, useEffect } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Search, Plus, MoreVertical, Printer, Share2, FileDown, CreditCard, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Invoice } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generatePDF, generateInvoicesSummary } from "@/lib/pdfGenerator";
import { initiateSTKPush } from "@/lib/mpesa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const statusConfig: Record<string, { className: string }> = {
  Paid: { className: "bg-success/10 text-success" },
  Partial: { className: "bg-warning/10 text-warning" },
  Unpaid: { className: "bg-muted text-muted-foreground" },
  Overdue: { className: "bg-destructive/10 text-destructive" },
  Pending: { className: "bg-warning/10 text-warning" },
  Draft: { className: "bg-slate-500/10 text-slate-500" },
};

import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { formatAmount } = useCurrency();
  const { companyDetails } = useCompany();
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await api.invoices.list();
      setInvoices(data);
    } catch (error) {
      console.error("Failed to load invoices:", error);
      toast.error("Failed to load invoices");
    }
  };

  // Payment State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // Status Update State
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusInvoice, setStatusInvoice] = useState<Invoice | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  const handleUpdateStatus = async () => {
    if (!statusInvoice || !newStatus) return;
    try {
      const updated = await api.invoices.update(statusInvoice.id, { status: newStatus as Invoice['status'] });
      setInvoices(invoices.map(inv => inv.id === updated.id ? { ...inv, status: updated.status } : inv));
      toast.success("Invoice status updated");
      setIsStatusDialogOpen(false);
      setStatusInvoice(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) return;
    try {
      await api.invoices.delete(id);
      setInvoices(invoices.filter(inv => inv.id !== id));
      toast.success("Invoice deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete invoice");
    }
  };

  const handleInitiatePayment = async () => {
    if (!selectedInvoice || !phoneNumber) return;
    setIsPaymentLoading(true);
    try {
      await initiateSTKPush({
        amount: selectedInvoice.amount - selectedInvoice.paid,
        phoneNumber,
        invoiceId: selectedInvoice.id
      });
      setIsPaymentDialogOpen(false);
      await loadInvoices();
    } catch (error) {
      console.error(error);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const filtered = invoices.filter(
    (inv) =>
      inv.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      new Date(inv.dueDate).toLocaleDateString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      new Date(inv.createdAt).toLocaleDateString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.paid, 0);
  const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.amount - inv.paid), 0);
  const overdue = invoices.filter((inv) => inv.status === "Overdue").length;

  const handleGeneratePDF = async (inv: Invoice, action: 'download' | 'preview' | 'print' | 'email' = 'download') => {
    if (!inv.client) return;

    const rawItems = typeof inv.items === 'string'
      ? JSON.parse(inv.items)
      : (inv.items || []);

    const items = rawItems.map((item: any) => ({
      ...item,
      price: Number(item.price ?? item.rate ?? item.amount ?? 0),
      quantity: Number(item.quantity ?? 1)
    }));

    // Calculate totals
    // Calculate totals with safe rounding
    const subtotal = Math.round(items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0) * 100) / 100;
    const vatRate = inv.vatRate || 0;
    const vatAmount = Math.round((subtotal * (vatRate / 100)) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;

    const pdfData = items.length > 0 ? items.map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      price: formatAmount(item.price),
      total: formatAmount(item.quantity * item.price)
    })) : [{
      description: "Service/Product",
      quantity: 1,
      price: formatAmount(inv.amount),
      total: formatAmount(inv.amount)
    }];

    await generatePDF({
      title: 'INVOICE',
      subtitle: `Invoice #: ${inv.id}`,
      filename: `invoice-${inv.id}`,
      data: pdfData,
      columns: [
        { header: 'Description', dataKey: 'description' },
        { header: 'Qty', dataKey: 'quantity' },
        { header: 'Price', dataKey: 'price' },
        { header: 'Total', dataKey: 'total' }
      ],
      companyDetails: {
        name: companyDetails?.name || 'Mitambo Africa Admin',
        address: companyDetails?.address || '',
        email: companyDetails?.email || '',
        phone: companyDetails?.phone || '',
        website: companyDetails?.website || '',
        subtitle: companyDetails?.subtitle || '',
        logo: companyDetails?.logo || null
      },
      clientDetails: {
        name: inv.client.name,
        address: inv.client.address || '',
        email: inv.client.email,
        phone: inv.client.phone || ''
      },
      totals: [
        { label: 'Subtotal:', value: formatAmount(subtotal || inv.amount) },
        ...(inv.showVat !== false ? [{ label: `VAT (${vatRate}%):`, value: formatAmount(vatAmount) }] : []),
        { label: 'Total:', value: formatAmount(inv.showVat !== false ? total : subtotal || inv.amount) }
      ],
      footerNote: "Thank you for your business!",
      action,
      qrUrl: `https://admin.mitambo.africa/invoices/${inv.id}`,
      createdBy: inv.user?.profile?.fullName || inv.user?.email || undefined
    });
  };

  const handleDownloadReport = async () => {
    if (filtered.length === 0) {
      toast.error("No invoices to export");
      return;
    }
    toast.info("Generating report...");
    await generateInvoicesSummary(filtered, companyDetails, formatAmount);
    toast.success("Report downloaded");
  };

  const handleShareWhatsApp = (inv: Invoice) => {
    const text = `Hi ${inv.client?.name}, here is invoice ${inv.id} for ${formatAmount(inv.amount)}. Status: ${inv.status}.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Just updating the return statement to include dialog and valid handlers
  // Note: I will need to insert the Dialog component at the end of return

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">Billing and payment tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleDownloadReport}>
            <FileDown className="h-4 w-4" /> Download Report
          </Button>
          <Button className="gap-2" onClick={() => {
            setEditingInvoice(null);
            setIsCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-xl font-bold mt-1 text-success">{formatAmount(totalRevenue)}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-xl font-bold mt-1 text-warning">{formatAmount(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-xl font-bold mt-1 text-destructive">{overdue} invoice{overdue !== 1 && "s"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 w-full max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search invoices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left font-medium py-3 px-5">Invoice #</th>
                <th className="text-left font-medium py-3 px-5">Client</th>
                <th className="text-left font-medium py-3 px-5">Amount</th>
                <th className="text-left font-medium py-3 px-5">Paid</th>
                <th className="text-left font-medium py-3 px-5">Status</th>
                <th className="text-left font-medium py-3 px-5">Due Date</th>
                <th className="text-left font-medium py-3 px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-5 font-medium text-primary cursor-pointer">{inv.id}</td>
                  <td className="py-3.5 px-5 cursor-pointer">{inv.client?.name || 'Unknown Client'}</td>
                  <td className="py-3.5 px-5 font-semibold cursor-pointer">{formatAmount(inv.amount)}</td>
                  <td className="py-3.5 px-5 cursor-pointer">{formatAmount(inv.paid)}</td>
                  <td className="py-3.5 px-5 cursor-pointer">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[inv.status || 'Draft']?.className || "bg-muted text-muted-foreground"}`}>
                      {inv.status || 'Draft'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-muted-foreground cursor-pointer">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="py-3.5 px-5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleGeneratePDF(inv, 'preview')}>
                          <Eye className="mr-2 h-4 w-4" /> Preview PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGeneratePDF(inv, 'download')}>
                          <FileDown className="mr-2 h-4 w-4" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGeneratePDF(inv, 'print')}>
                          <Printer className="mr-2 h-4 w-4" /> Print
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareWhatsApp(inv)}>
                          <Share2 className="mr-2 h-4 w-4" /> Share on WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedInvoice(inv);
                          setIsPaymentDialogOpen(true);
                        }}>
                          <CreditCard className="mr-2 h-4 w-4" /> Pay with M-Pesa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setStatusInvoice(inv);
                          setNewStatus(inv.status);
                          setIsStatusDialogOpen(true);
                        }}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit Status
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditingInvoice(inv);
                          setIsCreateDialogOpen(true);
                        }}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit Content
                        </DropdownMenuItem>
                        {user?.role === 'super_admin' && (
                          <DropdownMenuItem onClick={() => handleDeleteInvoice(inv.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pay via M-Pesa</DialogTitle>
            <DialogDescription>
              Enter your M-Pesa phone number to receive a payment prompt on your phone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Invoice Amount</Label>
              <div className="text-2xl font-bold">
                {selectedInvoice && formatAmount(selectedInvoice.amount - selectedInvoice.paid)}
              </div>
              <p className="text-xs text-muted-foreground">
                Invoice #{selectedInvoice?.id}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0712 345 678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleInitiatePayment} disabled={isPaymentLoading || !phoneNumber}>
              {isPaymentLoading ? "Sending request..." : "Pay Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Invoice Status</DialogTitle>
            <DialogDescription>
              Change the status of invoice #{statusInvoice?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CreateInvoiceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onInvoiceCreated={loadInvoices}
        invoice={editingInvoice || undefined}
      />
    </div >
  );
}
