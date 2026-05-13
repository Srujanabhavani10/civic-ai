import { analyzeComplaintRealtime } from "./aiAnalysis";
import { canonicalDepartmentName } from "./departmentRouting";

export type ChatbotIntent =
  | "contact_details_request"
  | "file_complaint_guidance"
  | "track_complaint"
  | "department_info"
  | "help"
  | "issue_department_suggestion"
  | "general_civic_help"
  | "greeting"
  | "unknown";

export interface ChatbotResponse {
  intent: ChatbotIntent;
  message: string;
  suggestedDepartment?: string;
  nextSteps: string[];
  confidence: number;
  followUpQuestion?: string;
  detectedCategory?: string;
  priorityHint?: "low" | "medium" | "high" | "critical";
  quickReplies?: string[];
}

export interface ChatbotContext {
  lastIntent?: ChatbotIntent;
  lastDepartment?: string;
  turns?: number;
}

const intentRules: { intent: ChatbotIntent; patterns: RegExp[] }[] = [
  {
    intent: "contact_details_request",
    patterns: [
      /\b(contact|phone|mobile|details|assigned|who\s+is\s+handling|officer|engineer)\b/i,
      /\b(department\s+contact|handler|person\s+in\s+charge)\b/i,
    ],
  },
  {
    intent: "file_complaint_guidance",
    patterns: [/\b(file|submit|register|raise)\b.*\b(complaint|issue)\b/i, /\bhow\s+to\s+file\b/i],
  },
  {
    intent: "track_complaint",
    patterns: [/\b(track|status|progress|update)\b.*\b(complaint|grv)\b/i, /\bwhere\s+is\s+my\s+complaint\b/i],
  },
  {
    intent: "department_info",
    patterns: [/\b(department|authority|office|who handles)\b/i],
  },
  {
    intent: "greeting",
    patterns: [/^(hi|hello|hey)\b/i],
  },
  {
    intent: "help",
    patterns: [/\b(help|assist|support|what can you do|options|menu)\b/i],
  },
  {
    intent: "general_civic_help",
    patterns: [/\b(civic|municipal|public|city)\b.*\b(help|support|service)\b/i],
  },
];

const civicIssueToDepartment: { pattern: RegExp; department: string; guidance: string }[] = [
  { pattern: /\b(garbage|waste|trash|litter|filth|dirty|dump)\b/i, department: "Sanitation Department", guidance: "Share location, landmark, and how long garbage has remained uncleared." },
  { pattern: /\b(water|leak|pipeline|pipe|drain|overflow|sewage|flood)\b/i, department: "Water Board", guidance: "Include leak point, severity, and whether water is affecting roads or homes." },
  { pattern: /\b(road|pothole|crack|asphalt|pavement)\b/i, department: "Road Maintenance", guidance: "Mention exact road stretch, hazard level, and traffic impact." },
  { pattern: /\b(light|streetlight|electric|power|wire|blackout|outage)\b/i, department: "Electricity Department", guidance: "Add pole/area details and note if it is a public safety risk." },
  { pattern: /\b(bus|traffic|transport|parking|congestion)\b/i, department: "Transport Department", guidance: "Describe route/area, timing, and recurring pattern." },
];

const typoAliases: Record<string, string> = {
  garbge: "garbage",
  garbadge: "garbage",
  watr: "water",
  leeking: "leaking",
  leke: "leak",
  pothol: "pothole",
  drainaage: "drainage",
  electrcity: "electricity",
  streelight: "streetlight",
};

const urgencyPattern = /\b(urgent|immediately|asap|serious|danger|unsafe|critical|emergency|health hazard)\b/i;
const negativeSentimentPattern = /\b(angry|frustrated|terrible|worst|annoyed|fed up|hate|pathetic)\b/i;

function normalizeForIntent(query: string): string {
  const cleaned = query.toLowerCase().replace(/[^\w\s-]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean).map((t) => typoAliases[t] || t);
  return tokens.join(" ");
}

function inferPriorityHint(query: string): "low" | "medium" | "high" | "critical" {
  if (/\b(critical|emergency|life threat|electrocution|fire)\b/i.test(query)) return "critical";
  if (urgencyPattern.test(query) || negativeSentimentPattern.test(query)) return "high";
  if (/\b(days|week|not\s*working|overflow|blocked|leak)\b/i.test(query)) return "medium";
  return "low";
}

function detectIntent(query: string): ChatbotIntent {
  const lower = normalizeForIntent(query.trim());
  for (const rule of intentRules) {
    if (rule.patterns.some((pattern) => pattern.test(lower))) {
      return rule.intent;
    }
  }

  const issueDepartmentHit = civicIssueToDepartment.find((entry) => entry.pattern.test(lower));
  if (issueDepartmentHit) {
    return "issue_department_suggestion";
  }

  return "unknown";
}

function looksLikeComplaintDescription(query: string): boolean {
  return /\b(garbage|waste|trash|water|leak|drain|road|pothole|streetlight|electric|power|sewage|flood|broken|damage|not working)\b/i.test(
    query
  );
}

export function generateChatbotResponse(query: string): ChatbotResponse {
  const trimmed = query.trim();
  const intent = detectIntent(trimmed);
  const normalized = normalizeForIntent(trimmed);
  const priorityHint = inferPriorityHint(normalized);
  const analysis = analyzeComplaintRealtime(normalized);

  if (!trimmed) {
    return {
      intent: "unknown",
      message: "Please type your question or describe your civic issue so I can help.",
      nextSteps: ["Describe the issue", "Include location and landmark"],
      confidence: 0,
      followUpQuestion: "Which civic issue do you want to report?",
      quickReplies: ["Report Complaint", "Track Complaint", "Department Help"],
    };
  }

  if (intent === "greeting") {
    return {
      intent,
      message: "Hi! I can help you report complaints, track status, and check which department is handling an issue.",
      nextSteps: ["Report Complaint", "Track Complaint", "Contact Department"],
      confidence: 0.9,
      followUpQuestion: "Would you like to report a new issue or track an existing complaint?",
      quickReplies: ["Report Complaint", "Track Complaint", "Department Help"],
    };
  }

  if (intent === "help") {
    return {
      intent,
      message:
        "Sure — I can help with all of these:\n• Report a civic complaint\n• Track complaint status\n• Contact/department guidance",
      nextSteps: ["Report Complaint", "Track Complaint", "Contact Department"],
      confidence: 0.92,
      followUpQuestion: "Which one do you want to do right now?",
      quickReplies: ["Report Complaint", "Track Complaint", "Contact Department"],
    };
  }

  if (intent === "contact_details_request") {
    const idMatch = trimmed.match(/\bGRV-\d+\b/i);
    if (idMatch) {
      return {
        intent,
        message:
          `Got it. For complaint ${idMatch[0].toUpperCase()}, open the Track Complaint page to view assigned department/officer details and latest remarks.`,
        nextSteps: ["Open Track Complaint", "Enter complaint ID", "View assigned details"],
        confidence: 0.9,
        followUpQuestion: "Do you want me to help you track this complaint now?",
        quickReplies: ["Track Complaint", "Report Complaint", "Department Help"],
      };
    }

    return {
      intent,
      message:
        "I can help with contact/assigned department details. Please share your complaint ID (for example: GRV-1045), or open Track Complaint to view assignment details.",
      nextSteps: ["Share complaint ID", "Open Track Complaint", "Check latest status"],
      confidence: 0.86,
      followUpQuestion: "Can you share your complaint ID?",
      quickReplies: ["Track Complaint", "How to find complaint ID", "Report Complaint"],
    };
  }

  if (intent === "file_complaint_guidance") {
    return {
      intent,
      message:
        "To file a complaint: 1) Select complaint category, 2) Describe the issue with at least 5 words and problem keywords, 3) Add exact location and landmark, 4) Upload clear issue photo, 5) Submit and save complaint ID.",
      nextSteps: ["Write issue description", "Add location + landmark", "Upload complaint evidence image"],
      confidence: 0.92,
      followUpQuestion: "Do you want help drafting your complaint text?",
      quickReplies: ["Draft Complaint Text", "Report Complaint", "Track Complaint"],
    };
  }

  if (intent === "track_complaint") {
    return {
      intent,
      message:
        "Use your complaint ID (for example, GRV-1234) in the tracking page. You can view current status, assigned department, and timeline updates there.",
      nextSteps: ["Open Track Complaint", "Enter complaint ID", "Review latest department remarks"],
      confidence: 0.92,
      followUpQuestion: "Please share your complaint ID (for example: GRV-1045).",
      quickReplies: ["Track Complaint", "How status works", "Report Complaint"],
    };
  }

  if (intent === "department_info") {
    return {
      intent,
      message:
        "Departments are assigned by issue type: garbage/waste -> Sanitation, water leakage/drainage -> Water Board, potholes/road damage -> Road Maintenance, streetlight/power issues -> Electricity Department.",
      nextSteps: ["Describe your issue", "I will suggest the right department"],
      confidence: 0.9,
      followUpQuestion: "What issue are you facing right now?",
      quickReplies: ["Garbage Issue", "Water Leakage", "Road Damage", "Streetlight Issue"],
    };
  }

  if (intent === "issue_department_suggestion") {
    const issueMatch = civicIssueToDepartment.find((entry) => entry.pattern.test(trimmed));
    const department = canonicalDepartmentName(issueMatch?.department || analysis?.department || "General Administration");
    const guidance =
      issueMatch?.guidance ||
      "Provide clear issue details, exact location, and how long the issue has been ongoing.";

    return {
      intent,
      message: `This looks like a ${department} complaint. ${guidance}${priorityHint === "high" || priorityHint === "critical" ? " Since this sounds urgent, please submit it immediately." : ""}`,
      suggestedDepartment: department,
      nextSteps: ["Add location and landmark", "Include duration/severity", "Submit complaint for department routing"],
      confidence: 0.88,
      followUpQuestion: "Can you share the exact location and how long this issue has existed?",
      detectedCategory: analysis?.category,
      priorityHint,
      quickReplies: ["Report Complaint", "Nearest Landmark", "Track Complaint"],
    };
  }

  if (intent === "general_civic_help") {
    return {
      intent,
      message:
        "I can help with complaint filing, issue categorization, department routing, and tracking guidance. Share your issue and I will suggest exact next steps.",
      nextSteps: ["Describe issue", "Request department suggestion", "Ask tracking help"],
      confidence: 0.82,
      followUpQuestion: "Would you like help with filing, tracking, or department mapping?",
      quickReplies: ["Report Complaint", "Track Complaint", "Department Help"],
    };
  }

  if (looksLikeComplaintDescription(normalized) && analysis?.department) {
    return {
      intent: "issue_department_suggestion",
      message: `Based on your query, the likely department is ${canonicalDepartmentName(analysis.department)}. I can help you file this with clear details so it gets resolved faster.`,
      suggestedDepartment: canonicalDepartmentName(analysis.department),
      nextSteps: ["Share exact location", "Mention issue duration", "Submit complaint"],
      confidence: 0.78,
      followUpQuestion: "Can you describe the exact location and nearby landmark?",
      detectedCategory: analysis.category,
      priorityHint,
      quickReplies: ["Report Complaint", "Track Complaint", "Department Help"],
    };
  }

  return {
    intent: "unknown",
    message:
      "I want to help, but I need a bit more detail. You can describe the issue, ask to track a complaint, or request contact details for a department.",
    nextSteps: ["Describe issue clearly", "Track complaint with ID", "Ask for department contact guidance"],
    confidence: 0.45,
    followUpQuestion: "What would you like to do: report, track, or get contact details?",
    quickReplies: ["Report Complaint", "Track Complaint", "Contact Department"],
  };
}
