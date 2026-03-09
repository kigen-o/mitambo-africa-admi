
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { User, LoginCredentials, SignupData } from "@/types";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    signup: (data: SignupData) => Promise<void>;
    signOut: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    signup: async () => { },
    signOut: () => { },
    refreshUser: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initialize from local storage
        const token = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (credentials: LoginCredentials) => {
        const data = await api.auth.login(credentials);
        localStorage.setItem('auth_token', data.session.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const signup = async (userData: SignupData) => {
        const data = await api.auth.signup(userData);
        // Automatically login after signup (optional, but convenient)
        // For now, just return, or we can set user if the backend returns a session
        // My server/index.ts signup returns { user }, no session.
    };

    const refreshUser = async () => {
        if (user?.id) {
            try {
                const updatedUser = await api.users.get(user.id);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            } catch (error) {
                console.error("Failed to refresh user", error);
            }
        }
    };

    const signOut = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, signOut, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
