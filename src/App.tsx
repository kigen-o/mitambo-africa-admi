
"use client";

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
import { SuperAdminRoute } from "@/components/ProtectedRoute";

import Dashboard from "./views/Dashboard";
import TasksPage from "./views/Tasks";
import MessagesPage from "./views/Messages";
import Clients from "./views/Clients";
import ClientDetails from "./views/ClientDetails";
import Projects from "./views/Projects";
import Quotations from "./views/Quotations";
import Invoices from "./views/Invoices";
import Reports from "./views/Reports";
import Settings from "./views/Settings";
import NotFound from "./views/NotFound";
import Login from "./views/Login";
import Signup from "./views/Signup";
import CalendarPage from "./views/Calendar";
import StaffDashboard from "./views/StaffDashboard";
import Products from "./views/Products";
import FilesPage from "./views/Files";
import Expenses from "./views/Expenses";
import Help from "./views/Help";

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
                    <BrowserRouter basename="/">
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
                        <Route path="/settings" element={<SuperAdminRoute><ProtectedLayout><Settings /></ProtectedLayout></SuperAdminRoute>} />
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
