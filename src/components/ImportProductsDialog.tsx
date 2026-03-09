import { useState } from "react";
import * as XLSX from "xlsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useProducts, Product } from "@/contexts/ProductsContext";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";

interface ImportProductsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImportProductsDialog({ open, onOpenChange }: ImportProductsDialogProps) {
    const { addProduct } = useProducts();
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file) {
            toast.error("Please select a file first");
            return;
        }

        setIsLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        toast.error("The file is empty");
                        setIsLoading(false);
                        return;
                    }

                    let successCount = 0;
                    let failCount = 0;

                    for (const row of jsonData) {
                        try {
                            // Map Excel columns to Product fields
                            // Support common headers: Name, Category, Price, Description, Unit
                            const productData: Omit<Product, 'id'> = {
                                name: String(row.Name || row.name || row.Product || ""),
                                price: Number(row.Price || row.price || 0),
                                category: (String(row.Category || row.category || "Other")) as Product['category'],
                                description: String(row.Description || row.description || ""),
                                unit: String(row.Unit || row.unit || "unit")
                            };

                            if (productData.name && !isNaN(productData.price)) {
                                await addProduct(productData);
                                successCount++;
                            } else {
                                failCount++;
                            }
                        } catch (err) {
                            failCount++;
                        }
                    }

                    toast.success(`Import complete: ${successCount} products added, ${failCount} failed.`);
                    onOpenChange(false);
                    setFile(null);
                } catch (err) {
                    console.error("Error parsing file:", err);
                    toast.error("Failed to parse file. Ensure it is a valid Excel or CSV.");
                } finally {
                    setIsLoading(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error("Import error:", error);
            toast.error("Failed to import products");
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Import Products</DialogTitle>
                    <DialogDescription>
                        Upload an Excel (.xlsx, .xls) or CSV file with headers: Name, Category, Price, Description, Unit.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-center w-full">
                        <Label
                            htmlFor="file-upload"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors border-muted-foreground/25"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {file ? (
                                    <div className="flex items-center gap-2 text-primary font-medium">
                                        <FileSpreadsheet className="h-6 w-6" />
                                        <span>{file.name}</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                                        <p className="mb-2 text-sm text-muted-foreground">
                                            <span className="font-semibold">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-muted-foreground">Excel or CSV</p>
                                    </>
                                )}
                            </div>
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isLoading}
                            />
                        </Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={!file || isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            "Import"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
