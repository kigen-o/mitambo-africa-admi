
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProductsProvider } from "@/contexts/ProductsContext"; // Added import
import { NotificationsProvider } from "@/contexts/NotificationsContext"; // Added import
import { ThemeProvider } from "@/components/theme-provider";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedLayout } from "@/components/ProtectedLayout";

import Dashboard from "./pages/Dashboard";
import TasksPage from "./pages/Tasks";
import MessagesPage from "./pages/Messages";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Projects from "./pages/Projects";
import Quotations from "./pages/Quotations";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CalendarPage from "./pages/Calendar";
import StaffDashboard from "./pages/StaffDashboard";
import Products from "./pages/Products";
import FilesPage from "./pages/Files";
import Expenses from "./pages/Expenses";
import Help from "./pages/Help";

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CurrencyProvider>
            <CompanyProvider>
              <AuthProvider>
                <NotificationsProvider> {/* Added NotificationsProvider */}
                  <ProductsProvider> {/* Added ProductsProvider */}
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        
                        {/* Protected Routes directly wrapped in layout */}
                        <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
                        <Route path="/dashboard" element={<Navigate to="/" replace />} />
                        <Route path="/staff" element={<ProtectedLayout><StaffDashboard /></ProtectedLayout>} />
                        <Route path="/tasks" element={<ProtectedLayout><TasksPage /></ProtectedLayout>} />
                        <Route path="/messages" element={<ProtectedLayout><MessagesPage /></ProtectedLayout>} />
                        <Route path="/clients" element={<ProtectedLayout><Clients /></ProtectedLayout>} />
                        <Route path="/clients/:id" element={<ProtectedLayout><ClientDetails /></ProtectedLayout>} />
                        <Route path="/products" element={<ProtectedLayout><Products /></ProtectedLayout>} />
                        <Route path="/files" element={<ProtectedLayout><FilesPage /></ProtectedLayout>} />
                        <Route path="/projects" element={<ProtectedLayout><Projects /></ProtectedLayout>} />
                        <Route path="/quotations" element={<ProtectedLayout><Quotations /></ProtectedLayout>} />
                        <Route path="/invoices" element={<ProtectedLayout><Invoices /></ProtectedLayout>} />
                        <Route path="/expenses" element={<ProtectedLayout><Expenses /></ProtectedLayout>} />
                        <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
                        <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
                        <Route path="/calendar" element={<ProtectedLayout><CalendarPage /></ProtectedLayout>} />
                        <Route path="/help" element={<ProtectedLayout><Help /></ProtectedLayout>} />
                        
                        <Route path="*" element={<ProtectedLayout><NotFound /></ProtectedLayout>} />
                      </Routes>
                    </BrowserRouter>
                  </ProductsProvider> {/* Closed ProductsProvider */}
                </NotificationsProvider> {/* Closed NotificationsProvider */}
              </AuthProvider>
            </CompanyProvider>
          </CurrencyProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
