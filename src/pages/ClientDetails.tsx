import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Building2,
    Mail,
    Phone,
    MapPin,
    Calendar,
    ArrowLeft,
    FileText,
    Receipt,
    FolderKanban,
    History,
    MessageSquare,
    PhoneCall,
    Video,
    FileDown,
    Eye,
    Trash2,
    Plus,
    Pencil
} from "lucide-react";
import { Client, Invoice, Quotation, Project, Communication } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/contexts/CurrencyContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { generatePDF } from "@/lib/pdfGenerator";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { CreateQuotationDialog } from "@/components/CreateQuotationDialog";
import { ClientDialog } from "@/components/ClientDialog";
import { CommunicationDialog } from "@/components/CommunicationDialog";

const commIcons = {
    email: Mail,
    call: PhoneCall,
    meeting: Video
};

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatAmount } = useCurrency();
    const { companyDetails } = useCompany();
    const [client, setClient] = useState<(Client & { initials?: string, joined?: string, invoices?: Invoice[], quotations?: Quotation[], projects?: Project[] }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
    const [isCommDialogOpen, setIsCommDialogOpen] = useState(false);
    const [selectedComm, setSelectedComm] = useState<Communication | null>(null);

    const loadClient = useCallback(async () => {
        try {
            const data = await api.clients.get(id!);
            setClient({
                ...data,
                initials: data.name.substring(0, 2).toUpperCase()
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to load client details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const handleDownloadInvoice = async (inv: Invoice) => {
        await generatePDF({
            title: "INVOICE",
            subtitle: `Invoice #: ${inv.id}`,
            filename: `Invoice-${inv.id}`,
            companyDetails,
            action: 'download',
            qrUrl: `https://admin.mitambo.africa/invoices?id=${inv.id}`,
            data: [
                {
                    description: "Service/Product",
                    amount: formatAmount(inv.amount),
                    paid: formatAmount(inv.paid),
                    status: inv.status
                }
            ],
            columns: [
                { header: "Description", dataKey: "description" },
                { header: "Amount", dataKey: "amount" },
                { header: "Paid", dataKey: "paid" },
                { header: "Status", dataKey: "status" },
            ],
            clientDetails: {
                name: client?.name || "Unknown Client",
                email: client?.email || "",
                phone: client?.phone || "",
                address: client?.address || ""
            },
            totals: [
                { label: "Total Amount:", value: formatAmount(inv.amount) },
                { label: "Amount Paid:", value: formatAmount(inv.paid) },
                { label: "Balance Due:", value: formatAmount(inv.amount - inv.paid) }
            ],
            footerNote: "Thank you for your business!"
        });
    };

    const handlePreviewInvoice = async (inv: Invoice) => {
        await generatePDF({
            title: "INVOICE",
            subtitle: `Invoice #: ${inv.id}`,
            filename: `Invoice-${inv.id}`,
            companyDetails,
            action: 'preview',
            qrUrl: `https://admin.mitambo.africa/invoices?id=${inv.id}`,
            data: [
                {
                    description: "Service/Product",
                    amount: formatAmount(inv.amount),
                    paid: formatAmount(inv.paid),
                    status: inv.status
                }
            ],
            columns: [
                { header: "Description", dataKey: "description" },
                { header: "Amount", dataKey: "amount" },
                { header: "Paid", dataKey: "paid" },
                { header: "Status", dataKey: "status" },
            ],
            clientDetails: {
                name: client?.name || "Unknown Client",
                email: client?.email || "",
                phone: client?.phone || "",
                address: client?.address || ""
            },
            totals: [
                { label: "Total Amount:", value: formatAmount(inv.amount) },
                { label: "Amount Paid:", value: formatAmount(inv.paid) },
                { label: "Balance Due:", value: formatAmount(inv.amount - inv.paid) }
            ],
            footerNote: "Thank you for your business!"
        });
    };

    const handleDownloadQuotation = async (quote: Quotation) => {
        await generatePDF({
            title: "QUOTATION",
            subtitle: `Quote #: ${quote.id}`,
            filename: `Quote-${quote.id}`,
            companyDetails,
            action: 'download',
            qrUrl: `https://admin.mitambo.africa/quotations?id=${quote.id}`,
            data: [
                {
                    description: quote.title,
                    amount: formatAmount(quote.amount),
                    status: quote.status
                }
            ],
            columns: [
                { header: "Description", dataKey: "description" },
                { header: "Amount", dataKey: "amount" },
                { header: "Status", dataKey: "status" },
            ],
            clientDetails: {
                name: client?.name || "Unknown Client",
                email: client?.email || "",
                phone: client?.phone || "",
                address: client?.address || ""
            },
            totals: [
                { label: "Total Estimate:", value: formatAmount(quote.amount) }
            ],
            footerNote: "This quotation is valid for 14 days. Subject to change."
        });
    };

    const handlePreviewQuotation = async (quote: Quotation) => {
        await generatePDF({
            title: "QUOTATION",
            subtitle: `Quote #: ${quote.id}`,
            filename: `Quote-${quote.id}`,
            companyDetails,
            action: 'preview',
            qrUrl: `https://admin.mitambo.africa/quotations?id=${quote.id}`,
            data: [
                {
                    description: quote.title,
                    amount: formatAmount(quote.amount),
                    status: quote.status
                }
            ],
            columns: [
                { header: "Description", dataKey: "description" },
                { header: "Amount", dataKey: "amount" },
                { header: "Status", dataKey: "status" },
            ],
            clientDetails: {
                name: client?.name || "Unknown Client",
                email: client?.email || "",
                phone: client?.phone || "",
                address: client?.address || ""
            },
            totals: [
                { label: "Total Estimate:", value: formatAmount(quote.amount) }
            ],
            footerNote: "This quotation is valid for 14 days. Subject to change."
        });
    };

    const loadClientData = useCallback(() => {
        if (id) {
            loadClient();
        }
    }, [id, loadClient]);

    useEffect(() => {
        loadClientData();
    }, [loadClientData]);

    const handleUpdateClient = async (data: Partial<Client>) => {
        try {
            await api.clients.update(id!, data);
            toast.success("Client profile updated");
            loadClient();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update client profile");
        }
    };

    const handleAddCommLog = async (data: Partial<Communication>) => {
        try {
            await api.communications.create({ ...data, clientId: id! });
            toast.success("Communication log added");
            loadClient();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add communication log");
        }
    };

    const handleUpdateCommLog = async (data: Partial<Communication>) => {
        if (!selectedComm) return;
        try {
            await api.communications.update(selectedComm.id, data);
            toast.success("Communication log updated");
            loadClient();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update communication log");
        } finally {
            setSelectedComm(null);
        }
    };

    const handleDeleteCommLog = async (commId: string) => {
        if (!confirm("Are you sure you want to delete this log?")) return;
        try {
            await api.communications.delete(commId);
            toast.success("Communication log deleted");
            loadClient();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete communication log");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading client details...</div>;
    const handleDeleteProject = async (projectId: string) => {
        if (!confirm("Are you sure you want to delete this project?")) return;
        try {
            await api.projects.delete(projectId);
            toast.success("Project deleted");
            loadClient();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete project");
        }
    };

    if (!client) return <div className="p-8 text-center text-muted-foreground">Client not found</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all" onClick={() => navigate("/clients")}>
                <ArrowLeft className="h-4 w-4" /> Back to Clients
            </Button>

            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                        {client.initials}
                    </AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
                    <div className="flex items-center gap-2 text-lg text-muted-foreground">
                        <Building2 className="h-5 w-5" />
                        {client.business}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" /> {client.email}
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" /> {client.phone}
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> {client.address}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Client since {new Date(client.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsClientDialogOpen(true)}>Edit Profile</Button>
                    <Button onClick={() => setIsProjectDialogOpen(true)}>New Project</Button>
                </div>
            </div>

            <ClientDialog
                open={isClientDialogOpen}
                onOpenChange={setIsClientDialogOpen}
                onSubmit={handleUpdateClient}
                initialData={client}
                title="Edit Client Profile"
            />

            <CreateProjectDialog
                open={isProjectDialogOpen}
                onOpenChange={setIsProjectDialogOpen}
                onProjectCreated={loadClient}
                clientId={id}
            />

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6 overflow-x-auto">
                    <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Overview</TabsTrigger>
                    <TabsTrigger value="quotations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Quotations ({client.quotations?.length || 0})</TabsTrigger>
                    <TabsTrigger value="invoices" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Invoices ({client.invoices?.length || 0})</TabsTrigger>
                    <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Projects ({client.projects?.length || 0})</TabsTrigger>
                    <TabsTrigger value="communications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Communications ({client.communications?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatAmount(client?.invoices?.reduce((acc: number, inv: Invoice) => acc + (inv.status === 'Paid' ? inv.amount : inv.paid), 0) || 0)}
                                </div>
                                <p className="text-xs text-muted-foreground">From {client.invoices?.length || 0} invoices</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">History Items</CardTitle>
                                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {(client.invoices?.length || 0) + (client.quotations?.length || 0)}
                                </div>
                                <p className="text-xs text-muted-foreground">Invoices & Quotations</p>
                            </CardContent>
                        </Card>
                    </div>

                    <h3 className="text-lg font-semibold mt-8 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {[
                            ...(client.invoices?.map(inv => ({ id: inv.id, type: 'invoice', title: `Invoice #${inv.id}`, date: new Date(inv.createdAt), status: inv.status })) || []),
                            ...(client.quotations?.map(q => ({ id: q.id, type: 'quotation', title: `Quotation #${q.id}`, date: new Date(q.createdAt), status: q.status })) || []),
                            ...(client.projects?.map(p => ({ id: p.id, type: 'project', title: p.name, date: new Date(p.createdAt), status: p.stage })) || []),
                            ...(client.communications?.map(c => ({ id: c.id, type: 'communication', title: c.subject, date: new Date(c.date), status: c.type })) || [])
                        ]
                            .sort((a, b) => b.date.getTime() - a.date.getTime())
                            .slice(0, 5)
                            .map((activity) => (
                                <div key={`${activity.type}-${activity.id}`} className="flex gap-4 items-start pb-4 border-b last:border-0">
                                    <div className="bg-muted p-2 rounded-full">
                                        <History className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{activity.title} ({activity.status})</p>
                                        <p className="text-xs text-muted-foreground">{activity.date.toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        {(!client.invoices?.length && !client.quotations?.length && !client.communications?.length) && (
                            <p className="text-sm text-muted-foreground py-4">No recent activity found.</p>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="quotations" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Quotations History</CardTitle>
                                <CardDescription>View and manage all quotations for this client.</CardDescription>
                            </div>
                            <Button className="gap-2" onClick={() => setIsQuotationDialogOpen(true)}>
                                <Plus className="h-4 w-4" /> New Quotation
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {client.quotations?.length === 0 && <p className="text-center py-4 text-muted-foreground">No quotations found</p>}
                                {client?.quotations?.map((q: Quotation) => (
                                    <div key={q.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary/10 p-2 rounded-lg">
                                                <FileText className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{q.title}</p>
                                                <p className="text-sm text-muted-foreground">{q.id} • {new Date(q.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right mr-4">
                                                <p className="font-bold">{formatAmount(q.amount)}</p>
                                                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{q.status}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handlePreviewQuotation(q)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDownloadQuotation(q)}>
                                                    <FileDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invoices" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Invoices History</CardTitle>
                                <CardDescription>Billing history and payment status.</CardDescription>
                            </div>
                            <Button className="gap-2" onClick={() => setIsInvoiceDialogOpen(true)}>
                                <Plus className="h-4 w-4" /> New Invoice
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {client.invoices?.length === 0 && <p className="text-center py-4 text-muted-foreground">No invoices found</p>}
                                {client?.invoices?.map((inv: Invoice) => (
                                    <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary/10 p-2 rounded-lg">
                                                <Receipt className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{inv.title}</p>
                                                <p className="text-sm text-muted-foreground">{inv.id} • {new Date(inv.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right mr-4">
                                                <p className="font-bold">{formatAmount(inv.amount)}</p>
                                                <span className={`text-xs px-2 py-1 rounded-full ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {inv.status}
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handlePreviewInvoice(inv)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDownloadInvoice(inv)}>
                                                    <FileDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="projects" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Projects</CardTitle>
                            <CardDescription>Ongoing and completed projects.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {client?.projects?.filter((p: Project) => p.clientId === client.id).length === 0 && <p className="text-center py-4 text-muted-foreground">No projects found</p>}
                                {client?.projects?.filter((p: Project) => p.clientId === client.id).map((p: Project) => (
                                    <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex-1">
                                            <p className="font-semibold">{p.name}</p>
                                            <p className="text-sm text-muted-foreground">Stage: {p.stage}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{p.priority}</span>
                                                <p className="text-xs text-muted-foreground mt-1">Created: {new Date(p.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDeleteProject(p.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="communications" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Communication Logs</CardTitle>
                                <CardDescription>History of emails, calls, and meetings.</CardDescription>
                            </div>
                            <Button className="gap-2" onClick={() => {
                                setSelectedComm(null);
                                setIsCommDialogOpen(true);
                            }}>
                                <Plus className="h-4 w-4" /> Add Log
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {client.communications?.length === 0 && (
                                    <p className="text-center py-8 text-muted-foreground">No communication logs recorded yet.</p>
                                )}
                                {client.communications?.map(comm => {
                                    const Icon = commIcons[comm.type as keyof typeof commIcons] || MessageSquare;
                                    return (
                                        <div key={comm.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="bg-muted p-2 rounded-full">
                                                <Icon className="h-4 w-4 text-foreground" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-semibold">{comm.subject}</h4>
                                                    <span className="text-xs text-muted-foreground">{new Date(comm.date).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{comm.summary}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                                                        {comm.type}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                                            setSelectedComm(comm);
                                                            setIsCommDialogOpen(true);
                                                        }}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCommLog(comm.id)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                    <CommunicationDialog
                        open={isCommDialogOpen}
                        onOpenChange={setIsCommDialogOpen}
                        onSubmit={selectedComm ? handleUpdateCommLog : handleAddCommLog}
                        initialData={selectedComm}
                    />
                </TabsContent>
            </Tabs>

            <CreateInvoiceDialog
                open={isInvoiceDialogOpen}
                onOpenChange={setIsInvoiceDialogOpen}
                onInvoiceCreated={loadClient}
                clientId={id}
            />

            <CreateQuotationDialog
                open={isQuotationDialogOpen}
                onOpenChange={setIsQuotationDialogOpen}
                onQuotationCreated={loadClient}
                clientId={id}
            />
        </div>
    );
}
