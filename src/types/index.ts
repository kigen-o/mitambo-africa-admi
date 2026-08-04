export interface User {
    id: string;
    email: string;
    role: 'admin' | 'user' | 'super_admin';
    profile?: Profile;
    createdAt: string;
}

export interface LoginCredentials {
    email: string;
    password?: string;
}

export interface SignupData {
    email: string;
    password?: string;
    fullName?: string;
    role?: 'admin' | 'user' | 'super_admin';
}

export interface Profile {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
}

export interface Product {
    id: string;
    name: string;
    category: 'Branding' | 'Printing' | 'Web' | 'Other';
    description: string;
    price: number;
    unit: string;
}

export interface BackendSettings {
    companyName?: string;
    companySubtitle?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    companyLogo?: string | null;
}

export interface Client {
    id: string;
    name: string;
    business?: string;
    email: string;
    phone?: string;
    address?: string;
    status: string;
    invoices?: Invoice[];
    quotations?: Quotation[];
    projects?: Project[];
    communications?: Communication[];
    createdAt: string;
}

export interface Communication {
    id: string;
    clientId: string;
    type: 'email' | 'call' | 'meeting' | string;
    subject: string;
    summary: string;
    date: string;
    createdAt: string;
}

export interface InvoiceItem {
    id?: string;
    description: string;
    quantity: number;
    price: number;
}

export interface Invoice {
    id: string;
    clientId: string;
    client?: Client;
    title: string;
    amount: number;
    paid: number;
    status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Draft';
    dueDate: string;
    vatRate?: number;
    items?: InvoiceItem[];
    createdAt: string;
    createdById?: string;
    user?: User;
    showVat?: boolean;
}

export interface Quotation {
    id: string;
    clientId: string;
    client?: Client;
    title: string;
    amount: number;
    status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
    validUntil: string;
    vatRate?: number;
    items?: InvoiceItem[];
    createdAt: string;
    createdById?: string;
    user?: User;
    showVat?: boolean;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    projectId?: string;
    status: 'pending' | 'in-progress' | 'completed' | string;
    priority?: 'Low' | 'Medium' | 'High' | string;
    assignedTo?: string;
    dueDate?: string;
    createdAt: string;
}

export interface Project {
    id: string;
    name: string;
    clientId: string;
    client?: Client;
    stage: string;
    progress: number;
    priority: 'Low' | 'Medium' | 'High';
    deadline: string;
    tasks?: Task[];
    createdAt: string;
}

export interface UserUpdateDTO {
    email?: string;
    fullName?: string;
    password?: string;
    avatarUrl?: string;
}

export interface DashboardStats {
    clients: number;
    invoices: number;
    products: number;
    revenue: number;
    expenses: number;
    netIncome: number;
    unpaidAmount: number;
    pendingQuotations: number;
}

export interface File {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
    taskId?: string;
    createdAt: string;
}

export interface Expense {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    createdAt: string;
}
