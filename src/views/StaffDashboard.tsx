import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Bell } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Task, Communication } from "@/types";
import { taskService } from "@/services/tasks";
import { CommunicationDialog } from "@/components/CommunicationDialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function StaffDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        clients: 0,
        invoices: 0,
        products: 0,
        revenue: 0
    });
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [isCommDialogOpen, setIsCommDialogOpen] = useState(false);

    useEffect(() => {
        api.dashboard.stats().then(setStats).catch(console.error);

        const fetchTasks = () => {
            if (user?.id) {
                taskService.getTasks(user.id)
                    .then(setTasks)
                    .catch(console.error)
                    .finally(() => setLoadingTasks(false));
            }
        };

        fetchTasks();

        // Subscribe to realtime updates
        const subscription = taskService.subscribeToTasks(() => {
            fetchTasks();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id]);

    const handleAddCommLog = async (data: Partial<Communication>) => {
        try {
            if (!data.clientId) {
                toast.error("Please select a client from the Clients page to log communication.");
                return;
            }
            await api.communications.create(data);
            toast.success("Communication log added");
            setIsCommDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to add communication log");
        }
    };

    const notifications = [
        { id: 1, text: `You have ${stats.clients} clients active`, time: "Just now" },
        { id: 2, text: `Total revenue: ${stats.revenue}`, time: "Updated today" },
        { id: 3, text: "Team meeting at 2:00 PM", time: "Yesterday" },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Staff Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">Manage your tasks and schedule.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* My Tasks */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            My Assigned Tasks
                        </CardTitle>
                        <CardDescription>Items requiring your attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {loadingTasks ? (
                                <p className="text-sm text-muted-foreground">Loading tasks...</p>
                            ) : tasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No pending tasks.</p>
                            ) : (
                                tasks.slice(0, 5).map((task) => (
                                    <div key={task.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate('/tasks')}>
                                        <div className="flex gap-3 items-start">
                                            <div className="mt-1">
                                                <div className={`h-4 w-4 rounded-full border-2 transition-colors ${task.status === 'completed' ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{task.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                                        task.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {task.priority || 'Medium'}
                                                    </span>
                                                    {task.dueDate && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> {new Date(task.dueDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            {tasks.length > 5 && (
                                <Button variant="ghost" className="w-full text-xs" onClick={() => navigate('/tasks')}>
                                    View All Tasks
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-primary" />
                            Notifications
                        </CardTitle>
                        <CardDescription>Recent updates and alerts</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {notifications.map((notif) => (
                                <div key={notif.id} className="flex gap-3 items-start pb-3 border-b last:border-0 last:pb-0">
                                    <div className="bg-primary/5 p-2 rounded-full">
                                        <Bell className="h-3 w-3 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm">{notif.text}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{notif.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary text-primary-foreground">
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-bold mb-1">Quick Action</h3>
                        <p className="text-primary-foreground/80 text-sm mb-4">Log a new client call or meeting.</p>
                        <button
                            className="bg-background text-primary text-sm font-semibold px-4 py-2 rounded-md hover:bg-background/90 transition-colors w-full"
                            onClick={() => setIsCommDialogOpen(true)}
                        >
                            Log Communication
                        </button>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-bold mb-1">Schedule</h3>
                        <p className="text-muted-foreground text-sm mb-4">View your upcoming calendar events.</p>
                        <button
                            className="border border-input bg-transparent hover:bg-accent text-sm font-medium px-4 py-2 rounded-md transition-colors w-full"
                            onClick={() => navigate('/calendar')}
                        >
                            View Calendar
                        </button>
                    </CardContent>
                </Card>
            </div>

            <CommunicationDialog
                open={isCommDialogOpen}
                onOpenChange={setIsCommDialogOpen}
                onSubmit={handleAddCommLog}
            />
        </div>
    );
}
