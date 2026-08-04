import { useState } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Search, Plus, FileText, Check, X, Clock, MoreVertical, Printer, Share2, FileDown, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generatePDF } from "@/lib/pdfGenerator";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useEffect } from "react";
import { Quotation } from "@/types";

// Quotations data fetched from API

const statusConfig: Record<string, { icon: typeof Check; className: string }> = {
  Approved: { icon: Check, className: "bg-success/10 text-success" },
  Pending: { icon: Clock, className: "bg-warning/10 text-warning" },
  Rejected: { icon: X, className: "bg-destructive/10 text-destructive" },
  Draft: { icon: FileText, className: "bg-muted text-muted-foreground" },
};

import { CreateQuotationDialog } from "@/components/CreateQuotationDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { formatAmount } = useCurrency();
  const { companyDetails } = useCompany();
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  // Status Update State
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusQuotation, setStatusQuotation] = useState<Quotation | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  const handleUpdateStatus = async () => {
    if (!statusQuotation || !newStatus) return;
    try {
      const updated = await api.quotations.update(statusQuotation.id, { status: newStatus as Quotation['status'] });
      setQuotations(quotations.map(q => q.id === updated.id ? { ...q, status: updated.status } : q));
      toast.success("Quotation status updated");
      setIsStatusDialogOpen(false);
      setStatusQuotation(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation? This action cannot be undone.")) return;
    try {
      await api.quotations.delete(id);
      setQuotations(quotations.filter(q => q.id !== id));
      toast.success("Quotation deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete quotation");
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      const data = await api.quotations.list();
      setQuotations(data);
    } catch (error) {
      console.error("Failed to load quotations:", error);
      toast.error("Failed to load quotations");
    }
  };

  const filtered = quotations.filter(
    (q) =>
      q.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      new Date(q.createdAt).toLocaleDateString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.validUntil && new Date(q.validUntil).toLocaleDateString().toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalValue = quotations.reduce((acc, q) => acc + q.amount, 0);
  const pendingQuotations = quotations.filter((q) => q.status === "Pending").length;
  // Mock conversion rate for now
  const conversionRate = quotations.length > 0 ? Math.round((quotations.filter(q => q.status === "Approved").length / quotations.length) * 100) : 0;

  const handleDownloadPDF = async (quote: Quotation, action: 'download' | 'preview' | 'print' | 'email' = 'download') => {
    if (!quote.client) return;

    const rawItems = typeof quote.items === 'string'
      ? JSON.parse(quote.items)
      : (quote.items || []);

    const items = rawItems.map((item: any) => ({
      ...item,
      price: Number(item.price ?? item.rate ?? item.amount ?? 0),
      quantity: Number(item.quantity ?? 1)
    }));

    // Calculate totals
    // Calculate totals with safe rounding
    const subtotal = Math.round(items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0) * 100) / 100;
    const vatRate = quote.vatRate || 0;
    const vatAmount = Math.round((subtotal * (vatRate / 100)) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;

    const pdfData = items.length > 0 ? items.map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      price: formatAmount(item.price),
      total: formatAmount(item.quantity * item.price)
    })) : [{
      description: quote.title,
      quantity: 1,
      price: formatAmount(quote.amount),
      total: formatAmount(quote.amount)
    }];

    await generatePDF({
      title: 'QUOTATION',
      subtitle: quote.id,
      filename: `quotation-${quote.id}`,
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
        name: quote.client.name,
        address: quote.client.address || '',
        email: quote.client.email,
        phone: quote.client.phone || ''
      },
      totals: [
        { label: 'Subtotal:', value: formatAmount(subtotal || quote.amount) },
        ...(quote.showVat !== false ? [{ label: `VAT (${vatRate}%):`, value: formatAmount(vatAmount) }] : []),
        { label: 'Total:', value: formatAmount(quote.showVat !== false ? total : subtotal || quote.amount) }
      ],
      footerNote: `Valid until: ${new Date(quote.validUntil).toLocaleDateString()}`,
      action,
      qrUrl: `https://admin.mitambo.africa/quotations/${quote.id}`,
      createdBy: quote.user?.profile?.fullName || quote.user?.email || undefined
    });
  };


  const handleShareWhatsApp = (quote: Quotation) => {
    const text = `Hi ${quote.client?.name}, here is quotation ${quote.id} for ${quote.title}. Amount: ${formatAmount(quote.amount)}. Status: ${quote.status}.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage client quotations</p>
        </div>
        <Button className="gap-2" onClick={() => {
          setEditingQuotation(null);
          setIsCreateDialogOpen(true);
        }}>
          <Plus className="h-4 w-4" /> New Quotation
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="text-xl font-bold mt-1 text-primary">{formatAmount(totalValue)}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-xl font-bold mt-1 text-warning">{pendingQuotations}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Conversion Rate</p>
          <p className="text-xl font-bold mt-1 text-success">{conversionRate}%</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 w-full max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search quotations..."
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
                <th className="text-left font-medium py-3 px-5">Quote #</th>
                <th className="text-left font-medium py-3 px-5">Client</th>
                <th className="text-left font-medium py-3 px-5">Description</th>
                <th className="text-left font-medium py-3 px-5">Amount</th>
                <th className="text-left font-medium py-3 px-5">Status</th>
                <th className="text-left font-medium py-3 px-5">Valid Until</th>
                <th className="text-left font-medium py-3 px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const config = statusConfig[q.status] || statusConfig['Draft'];
                const StatusIcon = config.icon;
                return (
                  <tr key={q.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-primary cursor-pointer">{q.id}</td>
                    <td className="py-3.5 px-5 cursor-pointer">{q.client?.name || 'Unknown'}</td>
                    <td className="py-3.5 px-5 text-muted-foreground cursor-pointer">{q.title}</td>
                    <td className="py-3.5 px-5 font-semibold cursor-pointer">{formatAmount(q.amount)}</td>
                    <td className="py-3.5 px-5 cursor-pointer">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[q.status || 'Draft']?.className || "bg-muted text-muted-foreground"}`}>
                        {(() => {
                          const StatusIcon = statusConfig[q.status || 'Draft']?.icon || FileText;
                          return <StatusIcon className="h-3.5 w-3.5" />;
                        })()}
                        {q.status || 'Draft'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-muted-foreground cursor-pointer">{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '-'}</td>
                    <td className="py-3.5 px-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadPDF(q, 'preview')}>
                            <Eye className="mr-2 h-4 w-4" /> Preview PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(q, 'download')}>
                            <FileDown className="mr-2 h-4 w-4" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(q, 'print')}>
                            <Printer className="mr-2 h-4 w-4" /> Print
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareWhatsApp(q)}>
                            <Share2 className="mr-2 h-4 w-4" /> Share on WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setStatusQuotation(q);
                            setNewStatus(q.status);
                            setIsStatusDialogOpen(true);
                          }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingQuotation(q);
                            setIsCreateDialogOpen(true);
                          }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Content
                          </DropdownMenuItem>
                          {user?.role === 'super_admin' && (
                            <DropdownMenuItem onClick={() => handleDeleteQuotation(q.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <CreateQuotationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onQuotationCreated={loadQuotations}
        quotation={editingQuotation || undefined}
      />

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Quotation Status</DialogTitle>
            <DialogDescription>
              Change the status of quotation #{statusQuotation?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
