import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Client } from "@/types";

interface ClientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (client: Partial<Client>) => void;
    initialData?: Client | null;
    title?: string;
}

export function ClientDialog({ open, onOpenChange, onSubmit, initialData, title }: ClientDialogProps) {
    const [formData, setFormData] = useState({
        name: "",
        business: "",
        email: "",
        phone: "",
        address: ""
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || "",
                business: initialData.business || "",
                email: initialData.email || "",
                phone: initialData.phone || "",
                address: initialData.address || ""
            });
        } else {
            setFormData({ name: "", business: "", email: "", phone: "", address: "" });
        }
    }, [initialData, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title || (initialData ? "Edit Client" : "Add New Client")}</DialogTitle>
                    <DialogDescription>
                        {initialData ? "Update the client's information below." : "Enter the details of the new client here."} Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="business" className="text-right">
                            Business
                        </Label>
                        <Input
                            id="business"
                            value={formData.business}
                            onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">
                            Phone
                        </Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">
                            Address
                        </Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
