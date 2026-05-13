import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText, Plus, Clock, CheckCircle2, AlertCircle, Search, Bell, ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { type Complaint } from "@/lib/mockData";
import { complaintStore } from "@/lib/complaintStore";

const statusConfig: Record<string, { icon: typeof Clock; className: string; label: string }> = {
  received: { icon: AlertCircle, className: "text-destructive bg-destructive/10", label: "Submitted" },
  assigned: { icon: Clock, className: "text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10", label: "Assigned" },
  "in-progress": { icon: Clock, className: "text-info bg-info/10", label: "In Progress" },
  resolved: { icon: CheckCircle2, className: "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10", label: "Resolved" },
};

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState(complaintStore.getNotifications());

  useEffect(() => {
    setComplaints(complaintStore.getAll());
    const unsub = complaintStore.subscribe(() => {
      setComplaints(complaintStore.getAll());
      setNotifications(complaintStore.getNotifications());
    });
    return unsub;
  }, []);

  const filtered = complaints
    .filter((c) => filter === "all" || c.status === filter)
    .filter((c) =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const counts = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "received" || c.status === "assigned").length,
    inProgress: complaints.filter((c) => c.status === "in-progress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  const recentNotifications = notifications.filter((n) => !n.read).slice(0, 3);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Welcome, {user?.name || "Citizen"}</h1>
          <p className="text-sm text-muted-foreground">Manage and track your complaints</p>
        </div>
        <Link to="/report" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Complaint
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Complaints", value: counts.total, icon: FileText, color: "bg-primary/10 text-primary" },
          { label: "Pending", value: counts.pending, icon: AlertCircle, color: "bg-destructive/10 text-destructive" },
          { label: "In Progress", value: counts.inProgress, icon: Clock, color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
          { label: "Resolved", value: counts.resolved, icon: CheckCircle2, color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="gov-card flex items-center gap-4 p-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="font-heading text-xl font-bold text-foreground">{s.value}</p></div>
          </motion.div>
        ))}
      </div>

      {recentNotifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {recentNotifications.map((n) => (
            <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`rounded-lg border p-3 ${n.type === "alert" ? "border-destructive/30 bg-destructive/5" : n.type === "success" ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5" : "border-info/30 bg-info/5"}`}>
              <div className="flex items-center gap-2 text-sm">
                <Bell className={`h-4 w-4 ${n.type === "alert" ? "text-destructive" : n.type === "success" ? "text-[hsl(var(--success))]" : "text-info"}`} />
                <span className="text-foreground">{n.message}</span>
                <span className="ml-auto text-xs text-muted-foreground">{n.time}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-input bg-card p-1">
          {[
            { key: "all", label: "All" },
            { key: "received", label: "Submitted" },
            { key: "assigned", label: "Assigned" },
            { key: "in-progress", label: "In Progress" },
            { key: "resolved", label: "Resolved" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search complaints..." className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="gov-card py-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No complaints found</p>
          <Link to="/report" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><Plus className="h-3.5 w-3.5" /> Submit your first complaint</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const st = statusConfig[c.status];
            return (
              <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`gov-card p-4 ${c.priority === "critical" ? "border-destructive/40" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-heading text-sm font-bold text-primary">{c.id}</span>
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${c.priority === "critical" ? "priority-critical" : c.priority === "high" ? "priority-high" : c.priority === "medium" ? "priority-medium" : "priority-low"}`}>
                        {c.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="mb-1 text-sm text-foreground line-clamp-1">{c.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{c.category}</span><span>{c.department}</span><span>{c.area}, {c.city}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${st.className}`}>
                      <st.icon className="h-3.5 w-3.5" />{st.label}
                    </span>
                    <Link to={`/track?id=${c.id}`} className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">Track</Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;
