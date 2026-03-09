import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface CompanyDetails {
    name: string;
    subtitle: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string | null; // Base64 string
}

interface CompanyContextType {
    companyDetails: CompanyDetails;
    updateCompanyDetails: (details: Partial<CompanyDetails>) => void;
    uploadLogo: (file: File) => Promise<void>;
    removeLogo: () => void;
}

const defaultDetails: CompanyDetails = {
    name: "Mitambo Africa",
    subtitle: "Agency Suite",
    address: "123 Creative Avenue, Nairobi, Kenya",
    phone: "+254 700 000 000",
    email: "hello@mitambo.africa",
    website: "www.mitambo.africa",
    logo: null
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(defaultDetails);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await api.settings.get();
            // Map backend fields to frontend interface if mismatched, or ensure consistency
            // Backend has companyName, companyEmail etc. Frontend has name, email...
            if (data && data.companyName) {
                setCompanyDetails({
                    name: data.companyName,
                    subtitle: data.companySubtitle || "Agency Suite",
                    address: data.companyAddress || defaultDetails.address,
                    phone: data.companyPhone || defaultDetails.phone,
                    email: data.companyEmail || defaultDetails.email,
                    website: data.companyWebsite || "www.mitambo.africa",
                    logo: data.companyLogo || null
                });
            }
        } catch (error) {
            console.error("Failed to load settings", error);
        }
    };

    const updateCompanyDetails = async (details: Partial<CompanyDetails>) => {
        const updatedDetails = { ...companyDetails, ...details };
        // Optimistic update
        setCompanyDetails(updatedDetails);

        try {
            // Map to backend fields using the full updated state
            const backendData = {
                companyName: updatedDetails.name,
                companyAddress: updatedDetails.address,
                companyPhone: updatedDetails.phone,
                companyEmail: updatedDetails.email,
                companyLogo: updatedDetails.logo,
                companyWebsite: updatedDetails.website,
                companySubtitle: updatedDetails.subtitle
            };
            await api.settings.update(backendData);
            toast.success("Settings saved");
        } catch (_error) {
            toast.error("Failed to save settings");
            // Optionally revert update if it fails
            loadSettings();
        }
    };

    const uploadLogo = (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    updateCompanyDetails({ logo: reader.result });
                    resolve();
                } else {
                    reject(new Error('Failed to convert image to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const removeLogo = () => {
        updateCompanyDetails({ logo: null });
    };

    return (
        <CompanyContext.Provider value={{ companyDetails, updateCompanyDetails, uploadLogo, removeLogo }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
};
