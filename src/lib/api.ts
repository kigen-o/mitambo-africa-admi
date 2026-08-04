import { User, Client, Invoice, Quotation, LoginCredentials, SignupData, Product, BackendSettings, UserUpdateDTO, DashboardStats, Task, Project, Expense, Communication, File as StoredFile } from "@/types";

// The backend ships with this Next.js application. Keeping every request on
// the same origin avoids CORS failures and stale external API configuration.
const API_URL = '/api';

export async function apiRequest<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    let response: Response;
    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });
    } catch {
        throw new Error('Unable to reach the application server. Please check your connection and try again.');
    }

    const text = await response.text();
    let data: unknown = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { error: text };
        }
    }

    if (!response.ok) {
        if (response.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth-expired'));
        }
        const errorData = data as { error?: string };
        throw new Error(errorData.error || 'API request failed');
    }

    return data as T;
}

export const api = {
    auth: {
        signup: (userData: SignupData) => apiRequest<{ user: User }>('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData),
        }),
        login: (credentials: LoginCredentials) => apiRequest<{ user: User, session: { access_token: string } }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        }),
    },
    invoices: {
        list: () => apiRequest<Invoice[]>('/invoices'),
        create: (data: Partial<Invoice>) => apiRequest<Invoice>('/invoices', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: Partial<Invoice>) => apiRequest<Invoice>(`/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => apiRequest<{ success: boolean }>(`/invoices/${id}`, {
            method: 'DELETE',
        }),
    },
    clients: {
        list: () => apiRequest<Client[]>('/clients'),
        get: (id: string) => apiRequest<Client>(`/clients/${id}`),
        create: (data: Partial<Client>) => apiRequest<Client>('/clients', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: Partial<Client>) => apiRequest<Client>(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    },
    products: {
        list: () => apiRequest<Product[]>('/products'),
        create: (data: Partial<Product>) => apiRequest<Product>('/products', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => apiRequest<{ success: boolean }>(`/products/${id}`, {
            method: 'DELETE',
        }),
    },
    quotations: {
        list: () => apiRequest<Quotation[]>('/quotations'),
        create: (data: Partial<Quotation>) => apiRequest<Quotation>('/quotations', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: Partial<Quotation>) => apiRequest<Quotation>(`/quotations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => apiRequest<{ success: boolean }>(`/quotations/${id}`, {
            method: 'DELETE',
        }),
    },
    settings: {
        get: () => apiRequest<BackendSettings>('/settings'),
        update: (data: BackendSettings) => apiRequest<BackendSettings>('/settings', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    },
    dashboard: {
        stats: () => apiRequest<DashboardStats>('/dashboard/stats'),
    },
    tasks: {
        list: (params?: { assignedTo?: string }) => {
            const query = params?.assignedTo ? `?assignedTo=${params.assignedTo}` : '';
            return apiRequest<Task[]>(`/tasks${query}`);
        },
        create: (data: Partial<Task>) => apiRequest<Task>('/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: Partial<Task>) => apiRequest<Task>(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => apiRequest<{ success: boolean }>(`/tasks/${id}`, {
            method: 'DELETE',
        }),
    },
    users: {
        list: () => apiRequest<User[]>('/users'),
        create: (data: SignupData) => apiRequest<User>('/users', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        get: (id: string) => apiRequest<User>(`/users/${id}`),
        update: (id: string, data: UserUpdateDTO) => apiRequest<User>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    },
    projects: {
        list: () => apiRequest<Project[]>('/projects'),
        create: (data: Partial<Project>) => apiRequest<Project>('/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => apiRequest<{ success: boolean }>(`/projects/${id}`, {
            method: 'DELETE',
        }),
    },
    files: {
        list: () => apiRequest<StoredFile[]>('/files'),
        upload: (formData: FormData) => apiRequest<StoredFile[]>('/files', {
            method: 'POST',
            body: formData,
        }),
        delete: (id: string) => apiRequest<{ success: boolean }>(`/files/${id}`, {
            method: 'DELETE',
        }),
    },
    expenses: {
        list: () => apiRequest<Expense[]>('/expenses'),
        create: (data: Partial<Expense>) => apiRequest<Expense>('/expenses', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => apiRequest<{ success: boolean }>(`/expenses/${id}`, {
            method: 'DELETE',
        }),
    },
    communications: {
        create: (data: Partial<Communication>) => apiRequest<Communication>('/communications', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: Partial<Communication>) => apiRequest<Communication>(`/communications/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => apiRequest<{ success: boolean }>(`/communications/${id}`, {
            method: 'DELETE',
        }),
    }
};
