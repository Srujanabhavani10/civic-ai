import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  LayoutDashboard, FileText, Building2, Brain, BarChart3, Settings,
  AlertCircle, Clock, CheckCircle2, TrendingUp, ChevronRight, ShieldAlert, Search, Filter,
} from "lucide-react";
import { complaintStore } from "@/lib/complaintStore";
import { type Complaint } from "@/lib/mockData";
import {
  categoryChartData, statusChartData, timelineChartData,
  departmentPerformance,
} from "@/lib/mockData";
import cityHeatmap from "@/assets/city-heatmap.jpg";

const sidebarLinks = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: FileText, label: "All Complaints" },
  { icon: Building2, label: "Departments" },
  { icon: Brain, label: "AI Analysis" },
  { icon: BarChart3, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

const statusColors: Record<string, string> = {
  received: "text-destructive",
  assigned: "text-[hsl(var(--warning))]",
  "in-progress": "text-[hsl(var(--warning))]",
  resolved: "text-[hsl(var(--success))]",
};

const statusDots: Record<string, string> = {
  received: "bg-destructive",
  assigned: "bg-[hsl(var(--warning))]",
  "in-progress": "bg-[hsl(var(--warning))]",
  resolved: "bg-[hsl(var(--success))]",
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState({ status: "all", department: "all", priority: "all" });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setComplaints(complaintStore.getAll());
    const unsub = complaintStore.subscribe(() => setComplaints(complaintStore.getAll()));
    return unsub;
  }, []);

  const stats = complaintStore.getStats();
  const notifications = complaintStore.getNotifications();

  const filtered = complaints
    .filter((c) => filter.status === "all" || c.status === filter.status)
    .filter((c) => filter.department === "all" || c.department === filter.department)
    .filter((c) => filter.priority === "all" || c.priority === filter.priority)
    .filter((c) => !searchQuery || c.id.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase()));

  const dashCards = [
    { label: "Total Complaints", value: stats.total, icon: FileText, color: "bg-primary/10 text-primary" },
    { label: "Critical / High", value: stats.critical + stats.high, icon: ShieldAlert, color: "bg-destructive/10 text-destructive" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
    { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  ];

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <h2 className="mb-4 font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Panel</h2>
          <nav className="space-y-1">
            {sidebarLinks.map((l) => (
              <button key={l.label} onClick={() => setActiveTab(l.label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === l.label ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <l.icon className="h-4 w-4" />{l.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Government Complaint Management — Live Data</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Live • {stats.total} complaints
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dashCards.map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="gov-card flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.color}`}><c.icon className="h-6 w-6" /></div>
              <div><p className="text-xs text-muted-foreground">{c.label}</p><p className="font-heading text-2xl font-bold text-foreground">{c.value}</p></div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="gov-card p-5">
            <h3 className="mb-4 font-heading text-sm font-semibold">Complaints by Category</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(224 71% 40%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="gov-card p-5">
            <h3 className="mb-4 font-heading text-sm font-semibold">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusChartData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="gov-card p-5">
            <h3 className="mb-4 font-heading text-sm font-semibold">Complaints Over Time</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timelineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="complaints" stroke="hsl(224 71% 40%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(224 71% 40%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Feed - live from store */}
          <div className="gov-card p-5">
            <h3 className="mb-4 font-heading text-sm font-semibold">Recent Activity</h3>
            <div className="space-y-3 max-h-[260px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <div key={n.id} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.type === "alert" ? "bg-destructive" : n.type === "success" ? "bg-[hsl(var(--success))]" : n.type === "warning" ? "bg-[hsl(var(--warning))]" : "bg-primary"}`} />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{n.message}</p>
                      <span className="text-xs text-muted-foreground">{n.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Heatmap & Department Performance */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="gov-card overflow-hidden">
            <div className="px-5 pt-5"><h3 className="mb-4 font-heading text-sm font-semibold">City Issue Heatmap</h3></div>
            <img src={cityHeatmap} alt="City complaint heatmap" className="w-full" />
            <div className="flex gap-4 p-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Critical/High</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--warning))]" /> Medium</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--success))]" /> Low</span>
            </div>
          </div>
          <div className="gov-card p-5">
            <h3 className="mb-4 font-heading text-sm font-semibold">Department Performance</h3>
            <div className="space-y-4">
              {departmentPerformance.map((d) => (
                <div key={d.name}>
                  <div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">{d.name}</span><span className="font-semibold text-foreground">{d.resolution}%</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${d.resolution}%` }} viewport={{ once: true }} transition={{ duration: 1 }} className="h-full rounded-full bg-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All Complaints with Filters */}
        <div className="gov-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-3">
            <h3 className="font-heading text-sm font-semibold">All Complaints</h3>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring w-40" />
              </div>
              <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none">
                <option value="all">All Status</option>
                <option value="received">Submitted</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <select value={filter.priority} onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value }))} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none">
                <option value="all">All Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Citizen</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Priority</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Department</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3 font-semibold text-primary">{c.id}</td>
                    <td className="px-5 py-3">{c.name}</td>
                    <td className="px-5 py-3">{c.category}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${c.priority === "critical" ? "priority-critical" : c.priority === "high" ? "priority-high" : c.priority === "medium" ? "priority-medium" : "priority-low"}`}>
                        {c.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${statusColors[c.status] || "text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDots[c.status] || "bg-muted"}`} />
                        {c.status.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.department}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">No complaints match the selected filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
