import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText, AlertCircle, Clock, CheckCircle2, MessageSquare, ChevronDown, Shield, ShieldAlert, Bell, Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { type Complaint } from "@/lib/mockData";
import { complaintStore } from "@/lib/complaintStore";
import { getComplaintsByDepartment } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

const statusOptions: { value: Complaint["status"]; label: string }[] = [
  { value: "received", label: "Submitted" },
  { value: "assigned", label: "Assigned" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

function statusPublicLabel(status: Complaint["status"]): string {
  switch (status) {
    case "received":
      return "NEW";
    case "assigned":
      return "ASSIGNED";
    case "in-progress":
      return "IN PROGRESS";
    case "resolved":
      return "RESOLVED";
    default:
      return status;
  }
}

const DepartmentDashboard = () => {
  const { user } = useAuth();
  const dept = user?.department || "Sanitation Department";
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [assignees, setAssignees] = useState<Record<string, string>>({});
  const [notifications, setNotifications] = useState(complaintStore.getNotifications());

  const isAdvancedDept = dept === "Sanitation Department" || dept === "Road Maintenance";
  const departmentEmployees: Record<string, string[]> = {
    "Sanitation Department": ["Sanitation Inspector A", "Ward Cleaner Team 1", "Solid Waste Supervisor"],
    "Road Maintenance": ["Road Engineer A", "Pothole Repair Team 2", "Infrastructure Inspector"],
  };

  const sortByNewest = (items: Complaint[]) =>
    [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const fetchComplaints = async () => {
    try {
      const latest = await getComplaintsByDepartment(dept);
      const sorted = sortByNewest(latest);
      setComplaints(sorted);
      console.log("Fetched complaints:", sorted);
      console.log("Department filter:", dept);
    } catch (err) {
      console.error("Failed to fetch department complaints", err);
    }
  };

  useEffect(() => {
    // Instant local state (no API latency).
    setComplaints(sortByNewest(complaintStore.getByDepartment(dept)));
    void fetchComplaints();
    const unsub = complaintStore.subscribe(() => {
      // Immediately reflect newly reported complaints in UI.
      setComplaints(sortByNewest(complaintStore.getByDepartment(dept)));
      setNotifications(complaintStore.getNotifications());
      void fetchComplaints();
    });

    const interval = setInterval(() => {
      void fetchComplaints();
    }, 5000);

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [dept]);

  const filtered = complaints.filter((c) => filter === "all" || c.status === filter);

  const counts = {
    total: complaints.length,
    critical: complaints.filter((c) => c.priority === "critical").length,
    high: complaints.filter((c) => c.priority === "high").length,
    pending: complaints.filter((c) => c.status !== "resolved").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  const handleStatusUpdate = (id: string, newStatus: Complaint["status"]) => {
    try {
      complaintStore.updateStatus(id, newStatus, remarks[id]);
      toast.success("Complaint " + id + " updated to " + newStatus);
      setRemarks((prev) => ({ ...prev, [id]: "" }));
      void fetchComplaints();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAssign = (complaintId: string) => {
    const employee = assignees[complaintId];
    if (!employee) {
      toast.error("Please select an employee to assign.");
      return;
    }
    try {
      complaintStore.assignComplaint(complaintId, employee, dept);
      toast.success(`Complaint ${complaintId} assigned to ${employee}`);
      void fetchComplaints();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReview = (complaintId: string) => {
    const note = reviewDrafts[complaintId]?.trim();
    if (!note) {
      toast.error("Please add a review note.");
      return;
    }
    try {
      complaintStore.addReviewNote(complaintId, user?.name || dept, note);
      toast.success(`Review added for ${complaintId}`);
      setReviewDrafts((prev) => ({ ...prev, [complaintId]: "" }));
      void fetchComplaints();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const urgentCount = counts.critical + counts.high;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Department Header */}
      <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">{dept}</h1>
            <p className="text-sm text-muted-foreground">Department Authority Dashboard — Manage & Resolve Complaints</p>
          </div>
        </div>
      </div>

      {/* Urgent alert */}
      {urgentCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span className="font-medium text-destructive">
              ⚠ {urgentCount} critical/high priority complaint{urgentCount > 1 ? "s" : ""} require immediate attention
            </span>
          </div>
        </motion.div>
      )}

      {/* Recent notifications */}
      {notifications.filter((n) => n.type === "alert" || n.type === "info").slice(0, 2).length > 0 && (
        <div className="mb-6 space-y-2">
          {notifications.filter((n) => !n.read).slice(0, 2).map((n) => (
            <div key={n.id} className={`rounded-lg border p-3 ${n.type === "alert" ? "border-destructive/30 bg-destructive/5" : "border-info/30 bg-info/5"}`}>
              <div className="flex items-center gap-2 text-sm">
                <Bell className={`h-4 w-4 ${n.type === "alert" ? "text-destructive" : "text-info"}`} />
                <span className="text-foreground">{n.message}</span>
                <span className="ml-auto text-xs text-muted-foreground">{n.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Assigned", value: counts.total, icon: FileText, color: "bg-primary/10 text-primary" },
          { label: "Critical/High", value: urgentCount, icon: ShieldAlert, color: "bg-destructive/10 text-destructive" },
          { label: "Pending", value: counts.pending, icon: Clock, color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
          { label: "Resolved", value: counts.resolved, icon: CheckCircle2, color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="gov-card flex items-center gap-4 p-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="font-heading text-xl font-bold text-foreground">{s.value}</p></div>
          </motion.div>
        ))}
      </div>

      <div className="mb-4 flex gap-1 rounded-lg border border-input bg-card p-1 w-fit">
        {[
          { value: "all", label: "All" },
          { value: "received", label: "New" },
          { value: "assigned", label: "Assigned" },
          { value: "in-progress", label: "In Progress" },
          { value: "resolved", label: "Resolved" },
        ].map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="gov-card py-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No complaints in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`gov-card overflow-hidden ${c.priority === "critical" ? "border-destructive/40" : ""}`}>
              <div className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-bold text-primary">{c.id}</span>
                    {c.status === "received" && (
                      <span className="rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        New complaint
                      </span>
                    )}
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${c.priority === "critical" ? "priority-critical" : c.priority === "high" ? "priority-high" : c.priority === "medium" ? "priority-medium" : "priority-low"}`}>
                      {c.priority.toUpperCase()}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${c.status === "resolved" ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : c.status === "in-progress" ? "bg-info/10 text-info" : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"}`}>
                      {statusPublicLabel(c.status)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-1">{c.description}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>By: {c.name}</span>
                    <span>{c.area}, {c.city}</span>
                    <span>AI: {c.confidence}%</span>
                    <span className="text-foreground/80">
                      {new Date(c.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedId === c.id ? "rotate-180" : ""}`} />
              </div>

              {expandedId === c.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border bg-muted/20 p-4 space-y-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><span className="text-muted-foreground">Citizen:</span> <span className="font-medium">{c.name}</span></div>
                    <div><span className="text-muted-foreground">Mobile:</span> <span className="font-medium">{c.mobile}</span></div>
                    <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{c.landmark}, {c.area}, {c.city}</span></div>
                    <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{c.category}</span></div>
                    <div><span className="text-muted-foreground">AI Confidence:</span> <span className="font-medium">{c.confidence}%</span></div>
                    {c.detectedIssue && (<div><span className="text-muted-foreground">AI Detected:</span> <span className="font-medium">{c.detectedIssue}</span></div>)}
                    {c.assignedTo && (<div><span className="text-muted-foreground">Assigned To:</span> <span className="font-medium">{c.assignedTo}</span></div>)}
                  </div>
                  <p className="text-sm text-foreground">{c.description}</p>

                  {isAdvancedDept && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                      <p className="text-xs font-semibold text-primary">Advanced Department Actions</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Assign to Employee</label>
                          <div className="flex gap-2">
                            <select
                              value={assignees[c.id] || ""}
                              onChange={(e) => setAssignees((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">Select employee...</option>
                              {(departmentEmployees[dept] || []).map((emp) => (
                                <option key={emp} value={emp}>{emp}</option>
                              ))}
                            </select>
                            <button onClick={() => handleAssign(c.id)} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
                              Assign
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Review Complaint</label>
                          <div className="flex gap-2">
                            <input
                              value={reviewDrafts[c.id] || ""}
                              onChange={(e) => setReviewDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              placeholder="Add review notes..."
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button onClick={() => handleReview(c.id)} className="rounded-lg bg-info px-3 py-2 text-xs font-medium text-white">
                              Review
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Timeline mini */}
                  {c.statusHistory && c.statusHistory.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Status History</p>
                      <div className="space-y-1.5">
                        {c.statusHistory.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`h-2 w-2 rounded-full ${h.status === "resolved" ? "bg-[hsl(var(--success))]" : h.status === "in-progress" ? "bg-[hsl(var(--warning))]" : "bg-primary"}`} />
                            <span className="font-medium text-foreground">{h.status}</span>
                            <span className="text-muted-foreground">{new Date(h.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                            {h.remarks && <span className="text-info">— {h.remarks}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {c.remarks && (
                    <div className="rounded-lg border border-info/30 bg-info/5 p-3">
                      <p className="text-xs font-medium text-info">Previous Remarks:</p>
                      <p className="mt-1 text-sm text-foreground">{c.remarks}</p>
                    </div>
                  )}

                  {c.reviewNotes && c.reviewNotes.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Review Notes</p>
                      <div className="space-y-1.5">
                        {c.reviewNotes.map((r, i) => (
                          <div key={`${c.id}-review-${i}`} className="text-xs">
                            <span className="font-medium text-foreground">{r.reviewedBy}</span>
                            <span className="text-muted-foreground"> ({new Date(r.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})</span>
                            <p className="text-foreground">{r.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="flex-1 min-w-[150px]">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Update Status</label>
                      <select defaultValue={c.status} onChange={(e) => handleStatusUpdate(c.id, e.target.value as Complaint["status"])} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                        {statusOptions.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Add Remarks</label>
                      <div className="flex gap-2">
                        <input value={remarks[c.id] || ""} onChange={(e) => setRemarks((prev) => ({ ...prev, [c.id]: e.target.value }))} placeholder="Add official remarks..." className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                        <button onClick={() => { if (remarks[c.id]?.trim()) handleStatusUpdate(c.id, c.status); }} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentDashboard;
