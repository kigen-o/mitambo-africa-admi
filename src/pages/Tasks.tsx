
import { useEffect, useState } from "react";
import { Plus, CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskDialog } from "@/components/TaskDialog";
import { taskService } from "@/services/tasks";
import { Task } from "@/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const data = await taskService.getTasks();
            setTasks(data);
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();

        // Subscribe to realtime updates
        const subscription = taskService.subscribeToTasks(() => {
            fetchTasks();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleEdit = (task: Task) => {
        setTaskToEdit(task);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setTaskToEdit(null);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
                    <p className="text-muted-foreground">
                        Manage your daily tasks and project assignments.
                    </p>
                </div>
                <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> New Task
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground">Loading tasks...</div>
                ) : tasks.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
                        No tasks found. Create one to get started.
                    </div>
                ) : (
                    tasks.map((task) => (
                        <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(task)}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {task.title}
                                </CardTitle>
                                {task.status === "completed" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : task.status === "in_progress" ? (
                                    <Clock className="h-4 w-4 text-blue-500" />
                                ) : (
                                    <Circle className="h-4 w-4 text-gray-400" />
                                )}
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {task.description || "No description"}
                                </p>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="capitalize">
                                            {task.status.replace("_", " ")}
                                        </Badge>
                                        <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'} className="capitalize">
                                            {task.priority || 'Medium'}
                                        </Badge>
                                    </div>
                                    {task.dueDate && (
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(task.dueDate), "MMM d")}
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <TaskDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                taskToEdit={taskToEdit}
                onTaskSaved={fetchTasks}
            />
        </div>
    );
}
