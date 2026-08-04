import { useState } from "react";
import { useProducts, Product } from "@/contexts/ProductsContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { RefreshCw, Plus, Trash2, Search, Package, Upload } from "lucide-react";
import { ImportProductsDialog } from "@/components/ImportProductsDialog";

export default function Products() {
    const { products, addProduct, removeProduct, syncFromWebsite, isSyncing } = useProducts();
    const { formatAmount } = useCurrency();
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({
        name: "",
        category: "Branding",
        description: "",
        price: 0,
        unit: "per project"
    });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSave = () => {
        if (newProduct.name && newProduct.price) {
            addProduct(newProduct as Omit<Product, 'id'>);
            setNewProduct({ name: "", category: "Branding", description: "", price: 0, unit: "per project" });
            setIsAddOpen(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Products & Services</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage your service catalog.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImportOpen(true)} className="gap-2">
                        <Upload className="h-4 w-4" /> Import
                    </Button>
                    <Button variant="outline" onClick={syncFromWebsite} disabled={isSyncing} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? "Syncing..." : "Sync from Website"}
                    </Button>
                    <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Product
                    </Button>
                </div>
            </div>

            <ImportProductsDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
            />

            <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 w-full max-w-md">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
                />
            </div>

            <div className="rounded-xl border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        {product.name}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${product.category === 'Branding' ? 'bg-purple-100 text-purple-700' :
                                        product.category === 'Printing' ? 'bg-blue-100 text-blue-700' :
                                            product.category === 'Web' ? 'bg-cyan-100 text-cyan-700' :
                                                'bg-slate-100 text-slate-700'
                                        }`}>
                                        {product.category}
                                    </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                                    {product.description}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold">{formatAmount(product.price)}</span>
                                        <span className="text-[10px] text-muted-foreground">{product.unit}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => removeProduct(product.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredProducts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No products found. Try adding one or syncing from the website.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Product</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={newProduct.name}
                                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={newProduct.category}
                                    onValueChange={(val: Product['category']) => setNewProduct({ ...newProduct, category: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Branding">Branding</SelectItem>
                                        <SelectItem value="Printing">Printing</SelectItem>
                                        <SelectItem value="Web">Web</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="price">Price</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    value={newProduct.price}
                                    onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Input
                                id="description"
                                value={newProduct.description}
                                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Product</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
