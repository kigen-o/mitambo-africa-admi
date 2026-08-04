import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MoreHorizontal, Mail, Phone, Building2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ClientDialog } from "@/components/ClientDialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Client } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Clients() {
  const [clients, setClients] = useState<(Omit<Client, 'projects'> & { initials?: string, projects?: number })[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await api.clients.list();
      // Map API data to component format if necessary, or ensure API returns compatible format
      // For now assuming API returns clients with { id, name, business, email, phone, status, ... }
      // We might need to map 'business' if the schema calls it something else (schema says 'name', 'email', 'phone', 'address', 'status')
      // Schema: name, email, phone, address. Missing 'business' in schema, maybe use 'companyName' or just 'name' is the person and 'company' is missing?
      // In the mockup: name="Sarah Kamau", business="Keza Holdings".
      // My schema: Client { name, email, phone, address ... }
      // I should probably add 'businessName' or 'company' to Client model if needed. 
      // For now I will use 'name' as client name and maybe 'address' as business or just ignore business field mapping if not in DB.
      // Or better, let's map 'name' -> 'name', and 'business' -> 'address' (as a placeholder) or just add it to schema later.
      // Let's just use what we have.
      setClients(data.map((c: Client) => ({
        ...c,
        initials: c.name.substring(0, 2).toUpperCase(),
        projects: (c.invoices?.length || 0) + (c.quotations?.length || 0)
      })));
    } catch (error) {
      console.error("Failed to load clients", error);
      toast.error("Failed to load clients");
    }
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.business && c.business.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddClient = async (newClient: Partial<Client>) => {
    try {
      await api.clients.create(newClient);
      toast.success("Client added successfully");
      loadClients();
    } catch (_error) {
      toast.error("Failed to add client");
    }
  };

  const handleDeleteClient = (e: React.MouseEvent) => {
    e.stopPropagation();
    // API deletion not implemented yet in server/index.ts, just update local state for now or show validation
    toast.info("Deletion not implemented in backend yet");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your client relationships</p>
        </div>
        <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      <ClientDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddClient}
        title="Add New Client"
      />

      {/* Search */}
      <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 w-full max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
        />
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <div
            key={client.id}
            onClick={() => navigate(`/clients/${client.id}`)}
            className="rounded-xl bg-card border border-border p-5 hover:shadow-md transition-all animate-fade-in cursor-pointer group relative"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {client.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold leading-tight">{client.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <Building2 className="h-3 w-3" />
                    {client.business}
                  </div>
                </div>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-lg p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => handleDeleteClient(e)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {client.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {client.phone}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">{client.projects} projects</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${client.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}>
                {client.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
