import { useState, useEffect } from "react";
import { Search, Plus, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { Project, Task } from "@/types";

const stageColors: Record<string, string> = {
  "Creative Brief": "bg-accent text-accent-foreground",
  Design: "bg-info/10 text-info",
  "Client Review": "bg-warning/10 text-warning",
  Production: "bg-success/10 text-success",
  Delivery: "bg-primary/10 text-primary",
  "Quality Check": "bg-muted text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  High: "border-destructive/50 bg-destructive/5",
  Medium: "border-warning/50 bg-warning/5",
  Low: "border-border",
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage all agency projects</p>
        </div>
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      <CreateProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onProjectCreated={loadProjects}
      />

      <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 w-full max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No projects found. Create one to get started!</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className={`rounded-xl bg-card border p-5 hover:shadow-md transition-all animate-fade-in cursor-pointer ${priorityColors[project.priority] || "border-border"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{project.client?.name}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColors[project.stage] || "bg-muted text-muted-foreground"}`}>
                  {project.stage}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {project.tasks?.filter((t: Task) => t.status === 'completed').length || 0}/
                    {project.tasks?.length || 0} tasks
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(project.deadline).toLocaleDateString()}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
