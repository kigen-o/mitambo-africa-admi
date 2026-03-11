import { ProtectedRoute } from "./ProtectedRoute";
import AppLayout from "./AppLayout";

export const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <ProtectedRoute>
            <AppLayout>
                {children}
            </AppLayout>
        </ProtectedRoute>
    );
};
