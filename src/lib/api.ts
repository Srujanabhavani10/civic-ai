// API Service Layer - Mock implementations ready to swap for real backend
// Replace baseURL and remove mock logic when connecting to Node.js/Express backend

import { mockComplaints, type Complaint, type ComplaintCategory } from "./mockData";
import { canonicalDepartmentName } from "./departmentRouting";

export type { Complaint } from "./mockData";

const API_BASE = "/api"; // Change to your backend URL e.g. "http://localhost:5000/api"

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "department";
  department?: string;
  phone?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

const mockUsers: User[] = [
  { id: "u1", name: "Rahul Sharma", email: "citizen@example.com", role: "citizen", phone: "9876543210" },
  { id: "u2", name: "Admin Officer", email: "sanitation@gov.in", role: "department", department: "Sanitation Department" },
  { id: "u3", name: "Road Inspector", email: "roads@gov.in", role: "department", department: "Road Maintenance" },
  { id: "u4", name: "Water Engineer", email: "water@gov.in", role: "department", department: "Water Board" },
  { id: "u5", name: "Electricity Officer", email: "electricity@gov.in", role: "department", department: "Electricity Department" },
];

export async function loginUser(email: string, _password: string): Promise<AuthResponse> {
  // Mock: find user by email
  await delay(800);
  const user = mockUsers.find((u) => u.email === email);
  if (!user) throw new Error("Invalid email or password");
  return { user, token: "mock-jwt-" + user.id };
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  role: "citizen" | "department";
  phone?: string;
  department?: string;
}): Promise<AuthResponse> {
  await delay(800);
  const user: User = {
    id: "u" + Date.now(),
    name: data.name,
    email: data.email,
    role: data.role,
    phone: data.phone,
    department: data.department,
  };
  return { user, token: "mock-jwt-" + user.id };
}

// ─── Complaints ──────────────────────────────────────────────────────────────

let localComplaints = [...mockComplaints];

export interface SubmitComplaintData {
  name: string;
  mobile: string;
  email?: string;
  city: string;
  area: string;
  landmark: string;
  category: ComplaintCategory;
  description: string;
  image?: File;
}

export interface AIAnalysisResult {
  category: string;
  priority: "high" | "medium" | "low";
  department: string;
  confidence: number;
  detectedIssue?: string;
  imageConfidence?: number;
}

const departmentMap: Record<string, { dept: string; priority: "high" | "medium" | "low" }> = {
  Sanitation: { dept: "Sanitation Department", priority: "high" },
  "Water Supply": { dept: "Water Board", priority: "medium" },
  "Road Damage": { dept: "Road Maintenance", priority: "high" },
  Drainage: { dept: "Sanitation Department", priority: "high" },
  "Street Light": { dept: "Electricity Department", priority: "medium" },
  Electricity: { dept: "Electricity Department", priority: "medium" },
  Other: { dept: "General Administration", priority: "low" },
};

const issueDetection: Record<string, string> = {
  Sanitation: "Garbage Overflow",
  "Water Supply": "Water Pipeline Leak",
  "Road Damage": "Pothole Damage",
  Drainage: "Drainage Blockage",
  "Street Light": "Non-Functional Streetlight",
  Electricity: "Power Outage",
  Other: "Civic Issue",
};

export async function submitComplaint(data: SubmitComplaintData): Promise<{ complaint: Complaint; aiResult: AIAnalysisResult }> {
  await delay(1200);
  const mapping = departmentMap[data.category] || departmentMap.Other;
  const confidence = Math.floor(Math.random() * 10 + 85);
  const aiResult: AIAnalysisResult = {
    category: data.category,
    priority: mapping.priority,
    department: mapping.dept,
    confidence,
  };
  if (data.image) {
    aiResult.detectedIssue = issueDetection[data.category] || "Civic Issue";
    aiResult.imageConfidence = Math.floor(Math.random() * 10 + 80);
  }
  const now = new Date().toISOString();
  const complaint: Complaint = {
    id: "GRV-" + Math.floor(Math.random() * 9000 + 1000),
    name: data.name,
    mobile: data.mobile,
    email: data.email,
    city: data.city,
    area: data.area,
    landmark: data.landmark,
    category: data.category,
    description: data.description,
    status: "received",
    priority: aiResult.priority,
    department: aiResult.department,
    confidence: aiResult.confidence,
    detectedIssue: aiResult.detectedIssue,
    imageConfidence: aiResult.imageConfidence,
    createdAt: now,
    statusHistory: [{ status: "received", timestamp: now }],
  };
  localComplaints = [complaint, ...localComplaints];
  return { complaint, aiResult };
}

/** Keep mock API list in sync when complaints are added via complaintStore (same browser session). */
export function appendComplaintRecord(complaint: Complaint): void {
  const normalized = { ...complaint, department: canonicalDepartmentName(complaint.department) };
  if (localComplaints.some((c) => c.id === normalized.id)) return;
  localComplaints = [normalized, ...localComplaints];
}

/** Upsert helper so store-side edits (status/remarks/assignment/review) stay consistent with API reads. */
export function upsertComplaintRecord(complaint: Complaint): void {
  const normalized = { ...complaint, department: canonicalDepartmentName(complaint.department) };
  const idx = localComplaints.findIndex((c) => c.id === normalized.id);
  if (idx === -1) {
    localComplaints = [normalized, ...localComplaints];
    return;
  }
  localComplaints[idx] = normalized;
}

export async function getComplaintById(id: string): Promise<Complaint | null> {
  await delay(400);
  return localComplaints.find((c) => c.id.toLowerCase() === id.toLowerCase()) || null;
}

export async function getComplaintsByUser(_userId: string): Promise<Complaint[]> {
  await delay(400);
  return localComplaints;
}

export async function getComplaintsByDepartment(department: string): Promise<Complaint[]> {
  await delay(400);
  const target = canonicalDepartmentName(department);
  return localComplaints.filter((c) => canonicalDepartmentName(c.department) === target);
}

export async function getAllComplaints(): Promise<Complaint[]> {
  await delay(400);
  return localComplaints;
}

export async function updateComplaintStatus(
  complaintId: string,
  status: Complaint["status"],
  remarks?: string
): Promise<Complaint> {
  await delay(600);
  const idx = localComplaints.findIndex((c) => c.id === complaintId);
  if (idx === -1) throw new Error("Complaint not found");
  localComplaints[idx] = {
    ...localComplaints[idx],
    status,
    remarks: remarks || localComplaints[idx].remarks,
  };
  return localComplaints[idx];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
