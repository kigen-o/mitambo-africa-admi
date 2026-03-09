
import { useState, useEffect } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Receipt } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { InvoiceItem, Client } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface CreateQuotationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onQuotationCreated: () => void;
    clientId?: string;
}

export function CreateQuotationDialog({ open, onOpenChange, onQuotationCreated, clientId }: CreateQuotationDialogProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: "", quantity: 1, price: 0 }
    ]);
    const [formData, setFormData] = useState({
        clientId: "",
        title: "",
        validUntil: "",
        vatRate: 0,
        showVat: true
    });

    useEffect(() => {
        if (open) {
            loadClients();
            if (clientId) {
                setFormData(prev => ({ ...prev, clientId }));
            }
        }
    }, [open, clientId]);

    const loadClients = async () => {
        try {
            const data = await api.clients.list();
            setClients(data);
        } catch (error) {
            console.error("Failed to load clients:", error);
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
            await api.quotations.create({
                clientId: formData.clientId,
                title: formData.title,
                amount: totalAmount,
                status: "Draft",
                validUntil: new Date(formData.validUntil).toISOString(),
                vatRate: formData.vatRate,
                items: items,
                createdById: user?.id,
                showVat: formData.showVat
            });
            toast.success("Quotation created successfully");
            onQuotationCreated();
            setFormData({ clientId: "", title: "", validUntil: "", vatRate: 0, showVat: true });
            setItems([{ description: "", quantity: 1, price: 0 }]);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create quotation");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Quotation</DialogTitle>
                    <DialogDescription>
                        Create a new quotation for a potential client with detailed estimates.
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
                                    <SelectValue placeholder="Select a client" />
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
                            <Label htmlFor="validUntil">Valid Until</Label>
                            <Input
                                id="validUntil"
                                type="date"
                                value={formData.validUntil}
                                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <div className="space-y-0.5">
                                <Label htmlFor="showVat">Show VAT on Quotation</Label>
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
                        <Label htmlFor="title">Quotation Title / Scope</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Full Branding Package"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Project Items</Label>
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
                                            placeholder="Itemized Service"
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
                            <p className="text-sm text-muted-foreground">Total Estimate</p>
                            <p className="text-2xl font-bold font-mono">{calculateTotal().toLocaleString()}</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || !formData.clientId}>
                            {isLoading ? "Creating..." : "Generate Quotation"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
