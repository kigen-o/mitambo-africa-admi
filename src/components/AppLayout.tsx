import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationsContext"; // Added import
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  Bell,
  CheckCircle2,
  Search,
  Menu,
  X,
  Palette,
  ChevronDown,
  HelpCircle,
  MessageSquare,
  Calendar,
  FolderOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext"; // Added import // Added imports
import { ProfileDialog } from "./ProfileDialog";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const menuItems = [
    {
      label: "MAIN", items: [
        { name: isAdmin ? "Dashboard" : "My Dashboard", icon: LayoutDashboard, path: isAdmin ? "/" : "/staff" },
        ...(isAdmin ? [{ name: "Staff Dashboard", icon: Users, path: "/staff" }] : []),
        { name: "Tasks", icon: CheckCircle2, path: "/tasks" },
        { name: "Clients", icon: Users, path: "/clients" },
        { name: "Projects", icon: FolderKanban, path: "/projects" },
      ]
    },
    {
      label: "BUSINESS", items: [
        { name: "Quotations", icon: FileText, path: "/quotations" },
        { name: "Invoices", icon: Receipt, path: "/invoices" },
        { name: "Products", icon: FolderKanban, path: "/products" },
        { name: "Reports", icon: BarChart3, path: "/reports" },
        { name: "Expenses", icon: Receipt, path: "/expenses" },
      ]
    },
    {
      label: "TOOLS", items: [
        { name: "Files", icon: FolderOpen, path: "/files" },
        { name: "Calendar", icon: Calendar, path: "/calendar" },
        { name: "Messages", icon: MessageSquare, path: "/messages" },
      ]
    },
  ];

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification
  } = useNotifications();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"
          } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Palette className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {sidebarOpen && (
            <div className="animate-slide-in">
              <h1 className="text-base font-bold text-sidebar-primary-foreground tracking-tight">Mitambo Africa</h1>
              <p className="text-[10px] text-sidebar-muted uppercase tracking-widest">Agency Suite</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {menuItems.map((group) => (
            <div key={group.label}>
              {sidebarOpen && (
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {sidebarOpen && <span className="animate-slide-in">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </Link>
          <Link
            to="/help"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
          >
            <HelpCircle className="h-[18px] w-[18px] shrink-0" />
            {sidebarOpen && <span>Help</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) setMobileOpen(!mobileOpen);
                else setSidebarOpen(!sidebarOpen);
              }}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-muted px-3 py-2 w-72">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search anything..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative rounded-lg p-2 hover:bg-muted transition-colors outline-none">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  {notifications.length > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.read ? "bg-muted/50" : ""
                          }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-sm font-medium ${notification.type === 'error' ? 'text-destructive' :
                            notification.type === 'success' ? 'text-green-600' : ''
                            }`}>
                            {notification.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="justify-center text-xs text-muted-foreground cursor-pointer"
                      onClick={() => {
                        notifications.forEach(n => clearNotification(n.id));
                      }}
                    >
                      Clear all
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div
              onClick={() => setIsProfileDialogOpen(true)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors cursor-pointer"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {user?.profile?.fullName?.substring(0, 2)?.toUpperCase() || "SA"}
                </AvatarFallback>
                {user?.profile?.avatarUrl && <AvatarImage src={user.profile.avatarUrl} />}
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold leading-none">{user?.profile?.fullName || "Super Admin"}</p>
                <p className="text-[11px] text-muted-foreground">{user?.email || "admin@printflow.com"}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
      <ProfileDialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen} />
    </div>
  );
}
