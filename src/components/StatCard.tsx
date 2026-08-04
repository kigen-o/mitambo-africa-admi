import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconBg?: string;
}

export default function StatCard({ title, value, change, trend, icon: Icon, iconBg }: StatCardProps) {
  return (
    <div className="rounded-xl bg-card border border-border p-5 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg || "bg-accent"}`}>
          <Icon className="h-5 w-5 text-accent-foreground" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-1 ${trend === "up"
            ? "bg-success/10 text-success"
            : trend === "down"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          }`}>
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {change}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
      </div>
    </div>
  );
}
