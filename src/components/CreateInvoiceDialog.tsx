
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Receipt } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { InvoiceItem, Client, Invoice } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface CreateInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInvoiceCreated: () => void;
    clientId?: string;
    invoice?: Invoice;
}

export function CreateInvoiceDialog({ open, onOpenChange, onInvoiceCreated, clientId, invoice }: CreateInvoiceDialogProps) {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: "", quantity: 1, price: 0 }
    ]);
    const [formData, setFormData] = useState({
        clientId: "",
        title: "",
        dueDate: "",
        vatRate: 0,
        status: "Unpaid" as Invoice['status'],
        showVat: true
    });

    useEffect(() => {
        if (open) {
            loadClients();
            if (invoice) {
                setFormData({
                    clientId: invoice.clientId,
                    title: invoice.title,
                    dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
                    vatRate: invoice.vatRate || 0,
                    status: invoice.status,
                    showVat: invoice.showVat ?? true
                });
                const parsedItems = typeof invoice.items === 'string'
                    ? JSON.parse(invoice.items)
                    : (invoice.items || []);
                setItems(parsedItems.length > 0 ? parsedItems : [{ description: "", quantity: 1, price: 0 }]);
            } else if (clientId) {
                setFormData(prev => ({ ...prev, clientId, status: "Unpaid", showVat: true }));
                setItems([{ description: "", quantity: 1, price: 0 }]);
            } else {
                setFormData({ clientId: "", title: "", dueDate: "", vatRate: 0, status: "Unpaid", showVat: true });
                setItems([{ description: "", quantity: 1, price: 0 }]);
            }
        }
    }, [open, clientId, invoice]);

    const loadClients = async () => {
        try {
            const data = await api.clients.list();
            setClients(data);
        } catch (error) {
            console.error("Failed to load clients", error);
            toast.error("Failed to load clients");
        }
    };

    const addItem = () => {
        setItems([...items, { description: "", quantity: 1, price: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: InvoiceItem[keyof InvoiceItem]) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const calculateTotal = () => {
        const subtotal = Math.round(items.reduce((sum, item) => sum + (item.quantity * item.price), 0) * 100) / 100;
        const vatAmount = formData.showVat ? Math.round((subtotal * (formData.vatRate / 100)) * 100) / 100 : 0;
        return Math.round((subtotal + vatAmount) * 100) / 100;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const totalAmount = calculateTotal();
            const date = new Date(formData.dueDate);
            if (isNaN(date.getTime())) {
                toast.error("Please enter a valid due date");
                setIsLoading(false);
                return;
            }

            const payload = {
                clientId: formData.clientId,
                title: formData.title,
                amount: totalAmount,
                dueDate: date.toISOString(),
                vatRate: formData.vatRate,
                items: items,
                status: formData.status,
                showVat: formData.showVat
            };

            if (invoice) {
                await api.invoices.update(invoice.id, payload);
                toast.success("Invoice updated successfully");
            } else {
                await api.invoices.create({
                    ...payload,
                    paid: 0,
                    createdById: user?.id
                });
                toast.success("Invoice created successfully");
            }
            onInvoiceCreated();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error(invoice ? "Failed to update invoice" : "Failed to create invoice");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{invoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
                    <DialogDescription>
                        {invoice ? "Update the details of your draft invoice." : "Create a new invoice for a client with detailed line items."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="client">Client</Label>
                            <Select
                                value={formData.clientId}
                                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value as Invoice['status'] })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Draft">Draft</SelectItem>
                                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                    <SelectItem value="Partial">Partial</SelectItem>
                                    <SelectItem value="Overdue">Overdue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vatRate">VAT Rate (%)</Label>
                            <Input
                                id="vatRate"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.vatRate}
                                onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <div className="space-y-0.5">
                                <Label htmlFor="showVat">Show VAT on Invoice</Label>
                                <p className="text-[10px] text-muted-foreground">Toggle VAT appearance on the document</p>
                            </div>
                        </div>
                        <Switch
                            id="showVat"
                            checked={formData.showVat}
                            onCheckedChange={(checked) => setFormData({ ...formData, showVat: checked })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Invoice Title / Project</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Website Redesign - Phase 1"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Line Items</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
                                <Plus className="h-4 w-4" /> Add Item
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end border-b border-border pb-3 last:border-0">
                                    <div className="col-span-6 space-y-1">
                                        <Label className="text-[10px] uppercase">Description</Label>
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateItem(index, "description", e.target.value)}
                                            placeholder="Service or Product"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-[10px] uppercase">Qty</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value))}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <Label className="text-[10px] uppercase">Price</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.price}
                                            onChange={(e) => updateItem(index, "price", parseFloat(e.target.value))}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-1 pb-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                            onClick={() => removeItem(index)}
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end p-4 bg-muted/30 rounded-lg">
                        <div className="text-right space-y-1">
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                            <p className="text-2xl font-bold">{calculateTotal().toLocaleString()}</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || !formData.clientId}>
                            {isLoading ? (invoice ? "Updating..." : "Creating...") : (invoice ? "Update Invoice" : "Generate Invoice")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
