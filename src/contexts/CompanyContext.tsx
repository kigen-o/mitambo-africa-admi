import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { BackendSettings } from '@/types';

export interface CompanyDetails {
    name: string;
    subtitle: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string | null; // Base64 string
    paymentDetails: string;
}

interface CompanyContextType {
    companyDetails: CompanyDetails;
    updateCompanyDetails: (details: Partial<CompanyDetails>) => Promise<void>;
    uploadLogo: (file: File) => Promise<void>;
    removeLogo: () => Promise<void>;
}

const defaultDetails: CompanyDetails = {
    name: "Mitambo Africa",
    subtitle: "Agency Suite",
    address: "123 Creative Avenue, Nairobi, Kenya",
    phone: "+254 700 000 000",
    email: "hello@mitambo.africa",
    website: "www.mitambo.africa",
    logo: null,
    paymentDetails: ""
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const fromBackendSettings = (
    data: BackendSettings,
    fallback: CompanyDetails = defaultDetails,
): CompanyDetails => ({
    name: data.companyName ?? fallback.name,
    subtitle: data.companySubtitle ?? fallback.subtitle,
    address: data.companyAddress ?? fallback.address,
    phone: data.companyPhone ?? fallback.phone,
    email: data.companyEmail ?? fallback.email,
    website: data.companyWebsite ?? fallback.website,
    logo: data.companyLogo ?? fallback.logo,
    paymentDetails: data.paymentDetails ?? fallback.paymentDetails,
});

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(defaultDetails);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setCompanyDetails(defaultDetails);
            return;
        }
        void loadSettings();
    }, [authLoading, user]);

    const loadSettings = async () => {
        try {
            const data = await api.settings.get();
            setCompanyDetails(fromBackendSettings(data));
        } catch (error) {
            console.error("Failed to load settings", error);
        }
    };

    const updateCompanyDetails = async (details: Partial<CompanyDetails>) => {
        const updatedDetails = { ...companyDetails, ...details };
        setCompanyDetails(updatedDetails);

        try {
            const backendData = {
                companyName: updatedDetails.name,
                companyAddress: updatedDetails.address,
                companyPhone: updatedDetails.phone,
                companyEmail: updatedDetails.email,
                companyWebsite: updatedDetails.website,
                companySubtitle: updatedDetails.subtitle,
                paymentDetails: updatedDetails.paymentDetails,
                ...(Object.prototype.hasOwnProperty.call(details, 'logo')
                    ? { companyLogo: updatedDetails.logo }
                    : {}),
            };
            const saved = await api.settings.update(backendData);
            setCompanyDetails(fromBackendSettings(saved, updatedDetails));
        } catch (error) {
            setCompanyDetails(companyDetails);
            throw error;
        }
    };

    const uploadLogo = async (file: File): Promise<void> => {
        const logo = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert image to base64'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read the logo file'));
            reader.onabort = () => reject(new Error('Logo upload was cancelled'));
            reader.readAsDataURL(file);
        });
        await updateCompanyDetails({ logo });
    };

    const removeLogo = async () => {
        await updateCompanyDetails({ logo: null });
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
