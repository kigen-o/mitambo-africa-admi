import { createContext, useContext, useState, useEffect, ReactNode } from 'react'; // Added useEffect
import { api } from '@/lib/api'; // Added api import
import { toast } from 'sonner';

export interface Product {
    id: string;
    name: string;
    category: 'Branding' | 'Printing' | 'Web' | 'Other';
    description: string;
    price: number;
    unit: string;
}

interface ProductsContextType {
    products: Product[];
    addProduct: (product: Omit<Product, 'id'>) => Promise<void>; // Changed to Promise
    removeProduct: (id: string) => Promise<void>; // Changed to Promise
    syncFromWebsite: () => Promise<void>;
    isSyncing: boolean;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export const useProducts = () => {
    const context = useContext(ProductsContext);
    if (!context) {
        throw new Error('useProducts must be used within a ProductsProvider');
    }
    return context;
};

export const ProductsProvider = ({ children }: { children: ReactNode }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await api.products.list();
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products:", error);
            toast.error("Failed to load products");
        }
    };

    const addProduct = async (product: Omit<Product, 'id'>) => {
        try {
            const newProduct = await api.products.create(product);
            setProducts([...products, newProduct]);
            toast.success("Product added successfully");
        } catch (_error) {
            toast.error("Failed to add product");
        }
    };

    const removeProduct = async (id: string) => {
        try {
            await api.products.delete(id);
            setProducts(products.filter(p => p.id !== id));
            toast.success("Product removed");
        } catch (_error) {
            toast.error("Failed to remove product");
        }
    };

    const syncFromWebsite = async () => {
        setIsSyncing(true);
        // Simulate scraping delay or implement real scraping if backend supports it
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.info("Sync feature not fully implemented yet");
        setIsSyncing(false);
    };

    return (
        <ProductsContext.Provider value={{ products, addProduct, removeProduct, syncFromWebsite, isSyncing }}>
            {children}
        </ProductsContext.Provider>
    );
};
