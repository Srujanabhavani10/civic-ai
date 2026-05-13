export const complaintCategories = [
  "Sanitation",
  "Water Supply",
  "Road Damage",
  "Drainage",
  "Street Light",
  "Electricity",
  "Other",
] as const;

export type ComplaintCategory = (typeof complaintCategories)[number];

export interface Complaint {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  city: string;
  area: string;
  landmark: string;
  category: ComplaintCategory;
  description: string;
  imageUrl?: string;
  status: "received" | "assigned" | "in-progress" | "resolved";
  priority: "critical" | "high" | "medium" | "low";
  department: string;
  confidence: number;
  detectedIssue?: string;
  imageConfidence?: number;
  remarks?: string;
  assignedTo?: string;
  reviewNotes?: { note: string; reviewedBy: string; timestamp: string }[];
  createdAt: string;
  statusHistory: { status: string; timestamp: string; remarks?: string }[];
  coordinates?: { lat: number; lng: number };
}

export const mockComplaints: Complaint[] = [
  {
    id: "GRV-1045",
    name: "Rahul Sharma",
    mobile: "9876543210",
    city: "Mumbai",
    area: "Andheri West",
    landmark: "Near Station Road",
    category: "Sanitation",
    description: "Garbage overflow near the main market area. Bins have not been cleared for 5 days. Health hazard for nearby residents.",
    status: "received",
    priority: "high",
    department: "Sanitation Department",
    confidence: 91,
    detectedIssue: "Garbage Overflow",
    imageConfidence: 87,
    createdAt: "2026-03-15T09:00:00Z",
    statusHistory: [
      { status: "received", timestamp: "2026-03-15T09:00:00Z" },
    ],
    coordinates: { lat: 19.1364, lng: 72.8296 },
  },
  {
    id: "GRV-1043",
    name: "Priya Patel",
    mobile: "9876543211",
    city: "Delhi",
    area: "Connaught Place",
    landmark: "Block A",
    category: "Road Damage",
    description: "Large pothole on the main road causing accidents. Multiple vehicles damaged. Immediate repair needed.",
    status: "assigned",
    priority: "critical",
    department: "Road Maintenance",
    confidence: 94,
    detectedIssue: "Pothole Damage",
    imageConfidence: 92,
    createdAt: "2026-03-14T14:30:00Z",
    statusHistory: [
      { status: "received", timestamp: "2026-03-14T14:30:00Z" },
      { status: "assigned", timestamp: "2026-03-14T16:00:00Z", remarks: "Assigned to road repair team" },
    ],
    coordinates: { lat: 28.6315, lng: 77.2167 },
  },
  {
    id: "GRV-1040",
    name: "Amit Kumar",
    mobile: "9876543212",
    city: "Bangalore",
    area: "Koramangala",
    landmark: "4th Block",
    category: "Water Supply",
    description: "Water pipeline leaking for the past 3 days. Significant water wastage in the entire colony.",
    status: "in-progress",
    priority: "medium",
    department: "Water Board",
    confidence: 88,
    createdAt: "2026-03-13T11:15:00Z",
    statusHistory: [
      { status: "received", timestamp: "2026-03-13T11:15:00Z" },
      { status: "assigned", timestamp: "2026-03-13T14:00:00Z" },
      { status: "in-progress", timestamp: "2026-03-14T09:00:00Z", remarks: "Repair team dispatched" },
    ],
    coordinates: { lat: 12.9352, lng: 77.6245 },
  },
  {
    id: "GRV-1039",
    name: "Sneha Verma",
    mobile: "9876543213",
    city: "Chennai",
    area: "T Nagar",
    landmark: "Main Road",
    category: "Road Damage",
    description: "Road repair completed successfully after fixing deep cracks.",
    status: "resolved",
    priority: "low",
    department: "Road Maintenance",
    confidence: 85,
    createdAt: "2026-03-12T08:45:00Z",
    statusHistory: [
      { status: "received", timestamp: "2026-03-12T08:45:00Z" },
      { status: "assigned", timestamp: "2026-03-12T10:00:00Z" },
      { status: "in-progress", timestamp: "2026-03-13T08:00:00Z" },
      { status: "resolved", timestamp: "2026-03-15T16:00:00Z", remarks: "Road repaired and leveled" },
    ],
    coordinates: { lat: 13.0418, lng: 80.2341 },
  },
  {
    id: "GRV-1038",
    name: "Vikram Singh",
    mobile: "9876543214",
    city: "Hyderabad",
    area: "Banjara Hills",
    landmark: "Road No. 12",
    category: "Street Light",
    description: "Multiple streetlights not working on the entire stretch. Very dangerous at night.",
    status: "assigned",
    priority: "medium",
    department: "Electricity Department",
    confidence: 89,
    createdAt: "2026-03-11T16:20:00Z",
    statusHistory: [
      { status: "received", timestamp: "2026-03-11T16:20:00Z" },
      { status: "assigned", timestamp: "2026-03-12T09:00:00Z", remarks: "Forwarded to electrical maintenance" },
    ],
    coordinates: { lat: 17.4156, lng: 78.4347 },
  },
  {
    id: "GRV-1036",
    name: "Kavita Joshi",
    mobile: "9876543215",
    city: "Pune",
    area: "Kothrud",
    landmark: "Near Bus Stand",
    category: "Drainage",
    description: "Drainage blocked causing waterlogging during rains. Open manhole dangerous for children.",
    status: "in-progress",
    priority: "high",
    department: "Sanitation Department",
    confidence: 92,
    createdAt: "2026-03-10T10:00:00Z",
    statusHistory: [
      { status: "received", timestamp: "2026-03-10T10:00:00Z" },
      { status: "assigned", timestamp: "2026-03-10T12:00:00Z" },
      { status: "in-progress", timestamp: "2026-03-11T08:00:00Z", remarks: "Clearing team on site" },
    ],
    coordinates: { lat: 18.5074, lng: 73.8077 },
  },
];

export const departmentPerformance = [
  { name: "Sanitation Department", resolution: 82, total: 245, resolved: 201 },
  { name: "Road Maintenance", resolution: 75, total: 180, resolved: 135 },
  { name: "Water Board", resolution: 90, total: 156, resolved: 140 },
  { name: "Electricity Department", resolution: 78, total: 120, resolved: 94 },
  { name: "Drainage Division", resolution: 70, total: 95, resolved: 67 },
];

export const categoryChartData = [
  { name: "Sanitation", count: 245 },
  { name: "Road Damage", count: 180 },
  { name: "Water Supply", count: 156 },
  { name: "Electricity", count: 120 },
  { name: "Drainage", count: 95 },
  { name: "Street Light", count: 78 },
];

export const statusChartData = [
  { name: "Pending", value: 180, fill: "hsl(0 84% 60%)" },
  { name: "In Progress", value: 250, fill: "hsl(38 92% 50%)" },
  { name: "Resolved", value: 445, fill: "hsl(142 71% 45%)" },
];

export const timelineChartData = [
  { month: "Oct", complaints: 120 },
  { month: "Nov", complaints: 150 },
  { month: "Dec", complaints: 180 },
  { month: "Jan", complaints: 200 },
  { month: "Feb", complaints: 165 },
  { month: "Mar", complaints: 210 },
];

export const activityFeed = [
  { id: "GRV-1045", text: "reported garbage issue", status: "received" as const, time: "2 min ago" },
  { id: "GRV-1043", text: "assigned to road maintenance department", status: "assigned" as const, time: "15 min ago" },
  { id: "GRV-1039", text: "road repair completed", status: "resolved" as const, time: "1 hour ago" },
  { id: "GRV-1040", text: "water leakage repair in progress", status: "in-progress" as const, time: "2 hours ago" },
  { id: "GRV-1038", text: "streetlight issue reported", status: "received" as const, time: "3 hours ago" },
];
