import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, CheckCircle2, Clock, Truck, FileCheck, AlertCircle, ShieldAlert, Bell } from "lucide-react";
import { type Complaint } from "@/lib/mockData";
import { complaintStore } from "@/lib/complaintStore";

const steps = [
  { key: "received", label: "Complaint Received", icon: FileCheck, desc: "Your complaint has been registered in our system" },
  { key: "assigned", label: "Assigned to Department", icon: Truck, desc: "Forwarded to the responsible department" },
  { key: "in-progress", label: "Work in Progress", icon: Clock, desc: "Department team is actively resolving the issue" },
  { key: "resolved", label: "Resolved", icon: CheckCircle2, desc: "Issue has been successfully resolved" },
] as const;

const stepIndex = { received: 0, assigned: 1, "in-progress": 2, resolved: 3 };

const priorityConfig: Record<string, { label: string; className: string; icon: typeof AlertCircle }> = {
  critical: { label: "CRITICAL", className: "priority-critical", icon: ShieldAlert },
  high: { label: "HIGH", className: "priority-high", icon: AlertCircle },
  medium: { label: "MEDIUM", className: "priority-medium", icon: AlertCircle },
  low: { label: "LOW", className: "priority-low", icon: CheckCircle2 },
};

const TrackComplaint = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("id") || "");
  const [result, setResult] = useState<Complaint | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setQuery(id);
      handleSearch(id);
    }
  }, [searchParams]);

  const handleSearch = async (id?: string) => {
    const searchId = (id || query).trim();
    if (!searchId) return;
    setSearching(true);
    await new Promise((r) => setTimeout(r, 600));
    const found = complaintStore.getById(searchId);
    setResult(found);
    setNotFound(!found);
    setSearching(false);
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const currentStep = result ? stepIndex[result.status] : -1;
  const pConfig = result ? priorityConfig[result.priority] || priorityConfig.low : null;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-bold text-foreground">Track Your Complaint</h1>
        <p className="mt-2 text-muted-foreground">Enter your Complaint ID to check real-time status and timeline.</p>
      </div>

      <form onSubmit={handleTrack} className="mx-auto mb-10 flex max-w-lg gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. GRV-1045"
          required
          className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={searching}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {searching ? <Clock className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Track
        </button>
      </form>

      {notFound && (
        <div className="mx-auto max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="font-semibold text-destructive">Complaint not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please check the Complaint ID and try again. Example IDs: GRV-1045, GRV-1043, GRV-1040
          </p>
        </div>
      )}

      {result && pConfig && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl"
        >
          {/* Complaint Details */}
          <div className="gov-card mb-6 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-muted-foreground">Complaint ID</span>
                <h2 className="font-heading text-xl font-bold text-foreground">{result.id}</h2>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${pConfig.className}`}>
                <pConfig.icon className="h-3.5 w-3.5" />
                {pConfig.label} PRIORITY
              </span>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">Citizen:</span> <span className="font-medium">{result.name}</span></div>
              <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{result.category}</span></div>
              <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{result.department}</span></div>
              <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{result.area}, {result.city}</span></div>
              <div><span className="text-muted-foreground">AI Confidence:</span> <span className="font-medium">{result.confidence}%</span></div>
              {result.detectedIssue && (
                <div><span className="text-muted-foreground">AI Detected:</span> <span className="font-medium">{result.detectedIssue}</span></div>
              )}
              <div><span className="text-muted-foreground">Filed:</span> <span className="font-medium">{new Date(result.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{result.description}</p>
            {result.remarks && (
              <div className="mt-3 rounded-lg border border-info/30 bg-info/5 p-3">
                <p className="text-xs font-medium text-info">Department Remarks:</p>
                <p className="mt-1 text-sm text-foreground">{result.remarks}</p>
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="gov-card p-6">
            <h3 className="mb-6 font-heading text-lg font-semibold">Status Timeline</h3>
            <div className="space-y-0">
              {steps.map((step, i) => {
                const isCompleted = i <= currentStep;
                const isCurrent = i === currentStep;
                const historyEntry = result.statusHistory?.find((h) => h.status === step.key);
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={isCurrent ? { scale: 0.8 } : {}}
                        animate={isCurrent ? { scale: [0.8, 1.1, 1] } : {}}
                        transition={{ duration: 0.5 }}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground"
                        } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                      >
                        <step.icon className="h-5 w-5" />
                      </motion.div>
                      {i < steps.length - 1 && (
                        <div className={`my-1 h-12 w-0.5 ${i < currentStep ? "bg-primary" : "bg-border"}`} />
                      )}
                    </div>
                    <div className="pb-6 pt-1.5">
                      <p className={`text-sm font-semibold ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                      {historyEntry && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(historyEntry.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          {historyEntry.remarks && <span className="ml-2 text-info">— {historyEntry.remarks}</span>}
                        </p>
                      )}
                      {isCurrent && (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-primary font-medium">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                          Current Status
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notification Card */}
          {result.statusHistory && result.statusHistory.length > 1 && (
            <div className="gov-card mt-6 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="font-heading text-sm font-semibold">Status History</h3>
              </div>
              <div className="space-y-2">
                {[...result.statusHistory].reverse().map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      entry.status === "resolved" ? "bg-[hsl(var(--success))]" : entry.status === "in-progress" ? "bg-[hsl(var(--warning))]" : "bg-primary"
                    }`} />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">
                        Status changed to <span className="font-bold">{entry.status.replace("-", " ")}</span>
                      </p>
                      {entry.remarks && <p className="text-xs text-muted-foreground mt-0.5">{entry.remarks}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(entry.timestamp).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default TrackComplaint;
