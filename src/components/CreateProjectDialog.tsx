
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Client } from "@/types";

interface CreateProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProjectCreated: () => void;
    clientId?: string;
}

export function CreateProjectDialog({ open, onOpenChange, onProjectCreated, clientId }: CreateProjectDialogProps) {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        clientId: clientId || "",
        stage: "Design",
        priority: "Medium",
        progress: 0,
        deadline: "",
    });

    useEffect(() => {
        if (open) {
            loadClients();
            if (clientId) {
                setFormData(prev => ({ ...prev, clientId }));
            }
        }
    }, [open, clientId]);

    const loadClients = async () => {
        try {
            const data = await api.clients.list();
            setClients(data);
        } catch (error) {
            console.error("Failed to load clients", error);
            toast.error("Failed to load clients");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.projects.create(formData);
            toast.success("Project created successfully");
            onProjectCreated();
            setFormData({
                name: "",
                clientId: clientId || "",
                stage: "Design",
                priority: "Medium",
                progress: 0,
                deadline: "",
            });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create project");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                        Add a new project to track progress, tasks, and deadlines.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Brand Identity Overhaul"
                            required
                        />
                    </div>

                    {!clientId && (
                        <div className="space-y-2">
                            <Label htmlFor="client">Client</Label>
                            <Select
                                value={formData.clientId}
                                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deadline">Deadline</Label>
                            <Input
                                id="deadline"
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stage">Initial Stage</Label>
                        <Select
                            value={formData.stage}
                            onValueChange={(value) => setFormData({ ...formData, stage: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Creative Brief">Creative Brief</SelectItem>
                                <SelectItem value="Design">Design</SelectItem>
                                <SelectItem value="Client Review">Client Review</SelectItem>
                                <SelectItem value="Production">Production</SelectItem>
                                <SelectItem value="Delivery">Delivery</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || !formData.clientId || !formData.name}>
                            {isLoading ? "Creating..." : "Create Project"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
