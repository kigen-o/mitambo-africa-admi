import StatCard from "@/components/StatCard";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Users, FolderKanban, FileText, DollarSign, CheckCircle2, Circle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "@/lib/api";
import { taskService } from "@/services/tasks";
import { Task, Project } from "@/types";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const revenueData = [
  { month: "Jan", revenue: 28000 },
  { month: "Feb", revenue: 35000 },
  { month: "Mar", revenue: 42000 },
  { month: "Apr", revenue: 31000 },
  { month: "May", revenue: 48000 },
  { month: "Jun", revenue: 52000 },
  { month: "Jul", revenue: 45000 },
];

const projectsByStage = [
  { name: "Brief", value: 5, color: "hsl(234, 85%, 60%)" },
  { name: "Design", value: 12, color: "hsl(205, 85%, 55%)" },
  { name: "Review", value: 8, color: "hsl(38, 92%, 55%)" },
  { name: "Production", value: 6, color: "hsl(152, 60%, 45%)" },
  { name: "Delivery", value: 3, color: "hsl(280, 65%, 55%)" },
];

const stageBadgeClass: Record<string, string> = {
  Brief: "bg-accent text-accent-foreground",
  Design: "bg-info/10 text-info",
  Review: "bg-warning/10 text-warning",
  Production: "bg-success/10 text-success",
  Delivery: "bg-primary/10 text-primary",
};

const priorityClass: Record<string, string> = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-warning/10 text-warning",
  Low: "bg-muted text-muted-foreground",
};


export default function Dashboard() {
  const { formatAmount, currency } = useCurrency();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({
    clients: 0,
    invoices: 0,
    products: 0,
    revenue: 0,
    pendingQuotations: 0
  });

  useEffect(() => {
    if (!loading && user && user.role !== 'admin' && user.role !== 'super_admin') {
      navigate('/staff');
      return;
    }

    if (user) {
      taskService.getTasks().then(setTasks).catch(console.error);
      api.projects.list().then(setProjects).catch(console.error);
      api.dashboard.stats().then(data => setStats(data as any)).catch(console.error);
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back! Here's your agency overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value={stats.clients.toString()} change="+0%" trend="up" icon={Users} />
        <StatCard title="Active Projects" value={projects.length.toString()} change="+0%" trend="up" icon={FolderKanban} />
        <StatCard title="Pending Quotations" value={stats.pendingQuotations.toString()} change="+0%" trend="down" icon={FileText} />
        <StatCard title="Revenue (MTD)" value={formatAmount(stats.revenue)} change="+0%" trend="up" icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl bg-card border border-border p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold">Revenue Overview</h3>
              <p className="text-sm text-muted-foreground">Monthly revenue for 2024</p>
            </div>
            <select className="text-sm bg-muted rounded-lg px-3 py-1.5 border-0 outline-none">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 15%, 90%)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `${currency.symbol}${v / 1000}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(228,15%,90%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(value: number) => [formatAmount(value), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="hsl(234, 85%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-card border border-border p-5 animate-fade-in">
          <h3 className="font-semibold mb-1">Projects by Stage</h3>
          <p className="text-sm text-muted-foreground mb-4">Current workflow distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={projectsByStage} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {projectsByStage.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {projectsByStage.map((stage) => (
              <div key={stage.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span>{stage.name}</span>
                </div>
                <span className="font-semibold">{stage.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Recent Projects</h3>
            <p className="text-sm text-muted-foreground">Latest active projects across your agency</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left font-medium py-3 pr-4">Project</th>
                <th className="text-left font-medium py-3 pr-4">Client</th>
                <th className="text-left font-medium py-3 pr-4">Stage</th>
                <th className="text-left font-medium py-3 pr-4">Priority</th>
                <th className="text-left font-medium py-3">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">No projects found</td>
                </tr>
              ) : (
                projects.slice(0, 5).map((project) => (
                  <tr key={project.id} className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/projects`)}>
                    <td className="py-3 pr-4 font-medium">{project.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{project.client?.name || "N/A"}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageBadgeClass[project.stage] || stageBadgeClass.Brief}`}>
                        {project.stage}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityClass[project.priority] || priorityClass.Medium}`}>
                        {project.priority}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{new Date(project.deadline).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Recent Tasks</h3>
            <p className="text-sm text-muted-foreground">Items requiring attention</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left font-medium py-3 pr-4">Task</th>
                <th className="text-left font-medium py-3 pr-4">Status</th>
                <th className="text-left font-medium py-3 pr-4">Priority</th>
                <th className="text-left font-medium py-3">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">No tasks found</td>
                </tr>
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <tr key={task.id} className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate('/tasks')}>
                    <td className="py-3 pr-4 font-medium flex items-center gap-2">
                      {task.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : task.status === "in_progress" ? (
                        <Clock className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400" />
                      )}
                      {task.title}
                    </td>
                    <td className="py-3 pr-4 capitalize">{task.status.replace('_', ' ')}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityClass[task.priority as any] || priorityClass.Medium}`}>
                        {task.priority || 'Medium'}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
