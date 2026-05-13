// Shared in-memory complaint store with status history tracking
import { type Complaint } from "./mockData";
import { mockComplaints } from "./mockData";
import { appendComplaintRecord, upsertComplaintRecord } from "./api";
import { canonicalDepartmentName } from "./departmentRouting";

type Listener = () => void;

class ComplaintStore {
  private complaints: Complaint[] = [...mockComplaints];
  private listeners: Set<Listener> = new Set();
  private notifications: { id: string; message: string; time: string; read: boolean; type: "info" | "success" | "warning" | "alert" }[] = [];

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getAll(): Complaint[] {
    return [...this.complaints];
  }

  getById(id: string): Complaint | null {
    return this.complaints.find((c) => c.id.toLowerCase() === id.toLowerCase()) || null;
  }

  getByDepartment(department: string): Complaint[] {
    const target = canonicalDepartmentName(department);
    const targetLower = target.toLowerCase();
    return this.complaints.filter((c) => canonicalDepartmentName(c.department).toLowerCase() === targetLower);
  }

  add(complaint: Complaint) {
    const normalized: Complaint = {
      ...complaint,
      department: canonicalDepartmentName(complaint.department),
    };
    this.complaints = [normalized, ...this.complaints];
    appendComplaintRecord(normalized);
    upsertComplaintRecord(normalized);
    this.addNotification(
      `New complaint ${normalized.id} submitted: ${normalized.category}`,
      normalized.priority === "critical" || normalized.priority === "high" ? "alert" : "info"
    );
    this.notify();
  }

  updateStatus(id: string, status: Complaint["status"], remarks?: string) {
    const idx = this.complaints.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Complaint not found");
    
    const now = new Date().toISOString();
    const historyEntry = { status, timestamp: now, remarks };
    
    this.complaints[idx] = {
      ...this.complaints[idx],
      status,
      remarks: remarks || this.complaints[idx].remarks,
      statusHistory: [...(this.complaints[idx].statusHistory || []), historyEntry],
    };
    upsertComplaintRecord(this.complaints[idx]);
    
    const typeMap: Record<string, "info" | "success" | "warning"> = {
      assigned: "info",
      "in-progress": "warning",
      resolved: "success",
    };
    
    this.addNotification(
      `Complaint ${id} status updated to ${status}${remarks ? `: "${remarks}"` : ""}`,
      typeMap[status] || "info"
    );
    this.notify();
    return this.complaints[idx];
  }

  assignComplaint(id: string, employeeName: string, assignedByDepartment: string) {
    const idx = this.complaints.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Complaint not found");
    const now = new Date().toISOString();

    this.complaints[idx] = {
      ...this.complaints[idx],
      assignedTo: employeeName,
      status: this.complaints[idx].status === "received" ? "assigned" : this.complaints[idx].status,
      statusHistory: [
        ...(this.complaints[idx].statusHistory || []),
        {
          status: "assigned",
          timestamp: now,
          remarks: `Assigned to ${employeeName} by ${assignedByDepartment}`,
        },
      ],
    };
    upsertComplaintRecord(this.complaints[idx]);

    this.addNotification(
      `Complaint ${id} assigned to ${employeeName}`,
      "info"
    );
    this.notify();
    return this.complaints[idx];
  }

  addReviewNote(id: string, reviewedBy: string, note: string) {
    const idx = this.complaints.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Complaint not found");
    const now = new Date().toISOString();

    this.complaints[idx] = {
      ...this.complaints[idx],
      reviewNotes: [
        ...(this.complaints[idx].reviewNotes || []),
        { note, reviewedBy, timestamp: now },
      ],
      remarks: note,
      statusHistory: [
        ...(this.complaints[idx].statusHistory || []),
        { status: this.complaints[idx].status, timestamp: now, remarks: `Review: ${note}` },
      ],
    };
    upsertComplaintRecord(this.complaints[idx]);

    this.addNotification(
      `Complaint ${id} reviewed by ${reviewedBy}`,
      "warning"
    );
    this.notify();
    return this.complaints[idx];
  }

  getNotifications() {
    return [...this.notifications];
  }

  private addNotification(message: string, type: "info" | "success" | "warning" | "alert" = "info") {
    this.notifications = [
      { id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, message, time: "Just now", read: false, type },
      ...this.notifications,
    ].slice(0, 30);
  }

  getUnreadCount() {
    return this.notifications.filter((n) => !n.read).length;
  }

  markAllRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.notify();
  }

  getStats() {
    const all = this.complaints;
    return {
      total: all.length,
      critical: all.filter((c) => c.priority === "critical").length,
      high: all.filter((c) => c.priority === "high").length,
      pending: all.filter((c) => c.status === "received" || c.status === "assigned").length,
      inProgress: all.filter((c) => c.status === "in-progress").length,
      resolved: all.filter((c) => c.status === "resolved").length,
    };
  }
}

export const complaintStore = new ComplaintStore();
