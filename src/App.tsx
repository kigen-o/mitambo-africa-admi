
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProductsProvider } from "@/contexts/ProductsContext"; // Added import
import { NotificationsProvider } from "@/contexts/NotificationsContext"; // Added import
import { ThemeProvider } from "@/components/theme-provider";
import { CompanyProvider } from "@/contexts/CompanyContext";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

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
                      <AppLayout>
                        <Routes>
                          <Route path="/login" element={<Login />} />
                          <Route path="/signup" element={<Signup />} />
                          
                          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                          <Route path="/staff" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
                          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
                          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                          <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                          <Route path="/clients/:id" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />
                          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                          <Route path="/files" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
                          <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                          <Route path="/quotations" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
                          <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                          <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
                          
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </AppLayout>
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
