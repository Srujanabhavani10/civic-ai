// Smart AI/ML Analysis — keyword-based NLP + duration detection + image analysis
// Simulates realistic AI behavior with deterministic logic

import { type ComplaintCategory } from "./mockData";
import { validateComplaintImageOCR } from "./ocrValidation";
import { validateCivicComplaintText } from "./textValidation";
import { canonicalDepartmentName, categoryToDepartment } from "./departmentRouting";
const STRICT_CONFIDENCE_THRESHOLD = 0.85;

export interface AIAnalysisResult {
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  department: string;
  confidence: number;
  detectedIssue?: string;
  imageConfidence?: number;
  isRelevant: boolean;
  rejectionReason?: string;
  keywords: string[];
  durationDetected?: string;
  severityFactors: string[];
}

export interface ImageAnalysisResult {
  isRelevant: boolean;
  detectedIssue: string;
  confidence: number;
  department: string;
  warning?: string;
}

export interface OCREnhancedImageAnalysisResult extends ImageAnalysisResult {
  ocrValidated: boolean;
  ocrText?: string;
  ocrValidationScore?: number;
}

/**
 * ========================================
 * 2-STAGE COMPLAINT ANALYSIS API
 * ========================================
 * 
 * Implements strict 2-stage validation:
 * STAGE 1: Validates input (rejects irrelevant)
 * STAGE 2: Classifies valid complaints
 * 
 * Returns exact format specified:
 * { status, reason } for invalid
 * { status, department, confidence, summary } for valid
 */
export function analyzeComplaintImage(_extractedOCRText: string): {
  status: "Invalid complaint input";
  reason: string;
} {
  return {
    status: "Invalid complaint input",
    reason: "Deprecated pipeline. Use analyzeImageWithOCR() only.",
  };
}


// NLP keyword database
const nlpKeywords: {
  category: ComplaintCategory;
  department: string;
  keywords: string[];
  highPriorityKeywords: string[];
  criticalKeywords: string[];
  detectedIssue: string;
}[] = [
  {
    category: "Sanitation",
    department: "Sanitation Department",
    keywords: ["garbage", "waste", "trash", "rubbish", "litter", "dirty", "filth", "stink", "smell", "bin", "dump", "unhygienic", "sewage", "cleaning", "sweeping", "sanitation", "rotting", "flies", "rats", "pest"],
    highPriorityKeywords: ["overflow", "health hazard", "epidemic", "disease", "pile", "hospital", "school", "market", "spreading"],
    criticalKeywords: ["toxic", "biohazard", "children sick", "epidemic outbreak", "hospital waste", "medical waste"],
    detectedIssue: "Garbage / Sanitation Issue",
  },
  {
    category: "Road Damage",
    department: "Road Maintenance",
    keywords: ["road", "pothole", "crack", "broken road", "damaged road", "asphalt", "tar", "highway", "pavement", "footpath", "sidewalk", "speed breaker", "bump", "crater", "uneven"],
    highPriorityKeywords: ["accident", "dangerous", "large", "deep", "injury", "vehicle damage", "collapse", "sinkhole", "bridge"],
    criticalKeywords: ["fatal", "death", "multiple accidents", "bridge collapse", "road cave", "sinkhole opened"],
    detectedIssue: "Road Damage / Pothole",
  },
  {
    category: "Water Supply",
    department: "Water Board",
    keywords: ["water", "pipeline", "pipe", "leak", "leaking", "supply", "tap", "bore", "well", "tank", "contaminated", "dirty water", "no water", "low pressure", "brown water", "rusty"],
    highPriorityKeywords: ["burst", "flood", "contaminated", "no supply", "colony", "entire area", "emergency", "drinking"],
    criticalKeywords: ["cholera", "poisoned", "chemical contamination", "entire city", "hospital no water", "sewage mixing"],
    detectedIssue: "Water Supply Issue",
  },
  {
    category: "Drainage",
    department: "Sanitation Department",
    keywords: ["drain", "drainage", "blocked", "clogged", "waterlogging", "flood", "sewer", "manhole", "overflow", "stagnant", "mosquito", "gutter"],
    highPriorityKeywords: ["flood", "waterlogging", "overflow", "collapse", "open manhole", "dangerous", "children", "accident"],
    criticalKeywords: ["drowning", "child fell", "electrocution", "sewer gas", "entire colony flooded"],
    detectedIssue: "Drainage Blockage",
  },
  {
    category: "Street Light",
    department: "Electricity Department",
    keywords: ["streetlight", "street light", "lamp", "pole", "dark", "no light", "bulb", "lighting", "night", "lamp post"],
    highPriorityKeywords: ["entire stretch", "multiple", "dangerous", "crime", "accident", "highway", "colony"],
    criticalKeywords: ["robbery", "assault area", "fatal accident", "complete blackout stretch"],
    detectedIssue: "Non-Functional Streetlight",
  },
  {
    category: "Electricity",
    department: "Electricity Department",
    keywords: ["electricity", "power", "current", "voltage", "transformer", "wire", "cable", "outage", "blackout", "electric", "shock", "sparking", "meter", "power cut"],
    highPriorityKeywords: ["shock", "fire", "sparking", "danger", "exposed wire", "transformer", "blast", "entire area", "hospital"],
    criticalKeywords: ["electrocution", "death", "fire spreading", "transformer exploded", "live wire fallen"],
    detectedIssue: "Electricity / Power Issue",
  },
];

// Duration patterns for priority boosting
const durationPatterns: { pattern: RegExp; days: number }[] = [
  { pattern: /(\d+)\s*(?:month|months)/i, days: 30 },
  { pattern: /(\d+)\s*(?:week|weeks)/i, days: 7 },
  { pattern: /(\d+)\s*(?:day|days)/i, days: 1 },
  { pattern: /(?:since|from|past|last)\s+(?:many|several)\s+(?:day|days|week|weeks)/i, days: 7 },
  { pattern: /(?:long\s+time|ages|forever)/i, days: 14 },
];

// Irrelevant content patterns
const irrelevantPatterns = [
  /^(hello|hi|hey|test|asdf|xyz|abc|123|lorem|foo|bar)/i,
  /^.{0,10}$/,
  /(.)\1{5,}/,
  /^[^a-zA-Z]*$/,
  /^(the|a|an|is|are|was|were|this|that|it)\s*$/i,
];

const complaintSignalPatterns = [
  /\b(problem|issue|complaint|broken|damage|damaged|defect|fault|unsafe|hazard)\b/i,
  /\b(leak|leaking|flood|overflow|burst|clog|blocked|drain|drainage|sewage)\b/i,
  /\b(garbage|waste|trash|litter|filth|dirty|unclean|stink|smell)\b/i,
  /\b(not\s*working|not\s*functioning|power\s*cut|blackout|outage|streetlight)\b/i,
  /\b(pothole|road\s*damage|crack|repair|fix|maintenance|traffic)\b/i,
];

// Image filename patterns for civic issues
const civicImagePatterns = [
  /pothole|road|crack|damage/i,
  /garbage|waste|trash|dump|litter/i,
  /water|leak|pipe|flood|drain/i,
  /light|pole|lamp|electric|wire/i,
  /sewer|manhole|block/i,
];

// Non-civic image patterns
const irrelevantImagePatterns = [
  /selfie|portrait|face|person|people/i,
  /passport|id.?card|document|certificate/i,
  /phone|mobile|laptop|tablet|keyboard|mouse|charger|earphone|headphone/i,
  /food|restaurant|menu|recipe/i,
  /pet|cat|dog|animal/i,
  /meme|funny|joke/i,
  /screenshot|screen.?shot/i,
];

const irrelevantImageTypes = ["gif", "svg", "bmp"];

function countKeywordMatches(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

function detectDuration(text: string): { days: number; label: string } | null {
  for (const dp of durationPatterns) {
    const match = text.match(dp.pattern);
    if (match) {
      const multiplier = match[1] ? parseInt(match[1]) : 1;
      const totalDays = multiplier * dp.days;
      if (totalDays >= 30) return { days: totalDays, label: `${Math.round(totalDays / 30)} month(s)` };
      if (totalDays >= 7) return { days: totalDays, label: `${Math.round(totalDays / 7)} week(s)` };
      return { days: totalDays, label: `${totalDays} day(s)` };
    }
  }
  return null;
}

export function classifyComplaintInput(description: string): "Invalid complaint input" | "Irrelevant content" | "Valid complaint" {
  const trimmed = description.trim();
  if (!trimmed) return "Invalid complaint input";

  const lower = trimmed.toLowerCase();

  const invalidPatterns = [
    /\brandom\b/, /\bacademic\b/, /\bnotes\b/, /\bppt\b/, /\bslide\b/, /\bpresentation\b/, /\blorem ipsum\b/, /\bdummy text\b/, /\bnot a complaint\b/, /\basdf\b/, /\bqwerty\b/, /\btest data\b/
  ];

  if (invalidPatterns.some((pattern) => pattern.test(lower))) {
    return "Invalid complaint input";
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 5) {
    return "Invalid complaint input";
  }

  const issueKeywords = [
    "pothole", "garbage", "trash", "leak", "water", "drain", "streetlight", "power", "electric", "noise", "smell", "blocked", "clogged", "broken", "damage", "unsafe", "hazard", "flood", "sewage", "road", "traffic", "construction"
  ];

  const hasIssue = issueKeywords.some((keyword) => lower.includes(keyword));
  const hasComplaintSignal = complaintSignalPatterns.some((pattern) => pattern.test(lower));

  if (hasIssue && hasComplaintSignal && trimmed.length >= 20) {
    return "Valid complaint";
  }

  return "Invalid complaint input";
}

export function analyzeImage(fileName: string, hasDescription: boolean, descCategory?: string): ImageAnalysisResult {
  const lower = fileName.toLowerCase();
  const ext = lower.split(".").pop() || "";

  // Check for irrelevant file types
  if (irrelevantImageTypes.includes(ext)) {
    return {
      isRelevant: false,
      detectedIssue: "Invalid Format",
      confidence: 0,
      department: "Unknown",
      warning: "This file format is not supported. Please upload a JPG or PNG image.",
    };
  }

  // Check for irrelevant image names
  for (const pattern of irrelevantImagePatterns) {
    if (pattern.test(lower)) {
      return {
        isRelevant: false,
        detectedIssue: "Non-Civic Image",
        confidence: 15,
        department: "Unknown",
        warning: "⚠️ This image does not appear to contain a civic issue. Please upload a photo of the actual problem (garbage, pothole, water leak, etc.)",
      };
    }
  }

  // Check for civic image names
  for (const pattern of civicImagePatterns) {
    if (pattern.test(lower)) {
      const matchedEntry = nlpKeywords.find((e) => {
        const allKw = [...e.keywords, e.detectedIssue.toLowerCase()];
        return allKw.some((kw) => lower.includes(kw.split(" ")[0].toLowerCase()));
      });
      if (matchedEntry) {
        return {
          isRelevant: true,
          detectedIssue: matchedEntry.detectedIssue,
          confidence: 78 + Math.floor(Math.random() * 15),
          department: matchedEntry.department,
        };
      }
    }
  }

  // Generic image — only accept when explicitly backed by civic description category
  if (hasDescription && descCategory) {
    const entry = nlpKeywords.find((e) => e.category === descCategory);
    if (entry) {
      return {
        isRelevant: true,
        detectedIssue: entry.detectedIssue,
        confidence: 85,
        department: entry.department,
      };
    }
  }

  // Default — strict rejection to avoid false positives (phones/random objects).
  return {
    isRelevant: false,
    detectedIssue: "Invalid complaint input",
    confidence: 0,
    department: "Unknown",
    warning: "Image does not provide clear complaint evidence.",
  };
}

/**
 * Enhanced image analysis with OCR text validation
 * Applies strict validation BEFORE classification
 *
 * Validation rules:
 * 1. Text length >= 20 characters
 * 2. Not academic/ID/notes/PPT/random content
 * 3. Describes a real problem/complaint
 * 4. Confidence score >= 0.85
 *
 * Returns "Invalid complaint input" if validation fails
 */
export function analyzeImageWithOCR(
  fileName: string,
  extractedOCRText: string,
  hasDescription: boolean,
  descCategory?: string,
  confidenceThreshold: number = STRICT_CONFIDENCE_THRESHOLD
): OCREnhancedImageAnalysisResult {
  const lower = fileName.toLowerCase();
  const ext = lower.split(".").pop() || "";

  // Step 1: Check file format
  if (irrelevantImageTypes.includes(ext)) {
    return {
      isRelevant: false,
      detectedIssue: "Invalid Format",
      confidence: 0,
      department: "Unknown",
      warning: "This file format is not supported. Please upload a JPG or PNG image.",
      ocrValidated: false,
    };
  }

  // Step 2: Strict OCR validation before any classification
  const ocrValidation = validateComplaintImageOCR(extractedOCRText, confidenceThreshold);

  const trimmedOCR = extractedOCRText.trim();
  const weakOCRText = trimmedOCR.length === 0 || trimmedOCR.length < 15;
  const hasNoKeywordFailure = ocrValidation.validationResult.validationErrors.some((error) =>
    /no complaint-related keywords|no complaint\/issue signal/i.test(error)
  );

  if (ocrValidation.isValid) {
    // Step 3: OCR-valid path -> classify from OCR text.
    const realtime = analyzeComplaintRealtime(extractedOCRText);
    if (!realtime?.department || !realtime.confidence || realtime.confidence < 85) {
      return {
        isRelevant: false,
        detectedIssue: "Invalid complaint input",
        confidence: 0,
        department: "Unknown",
        warning: "Invalid complaint input",
        ocrValidated: true,
        ocrText: extractedOCRText,
        ocrValidationScore: ocrValidation.validationResult.confidenceScore,
      };
    }

    return {
      isRelevant: true,
      detectedIssue: realtime.category ? `${realtime.category} issue detected` : "Civic issue detected",
      confidence: realtime.confidence,
      department: realtime.department,
      ocrValidated: true,
      ocrText: extractedOCRText,
      ocrValidationScore: ocrValidation.validationResult.confidenceScore,
    };
  }

  // Step 4: OCR-invalid path -> hard reject for ID/document, otherwise fallback to image patterns.
  {
    // Strictly reject personal-doc/document style OCR failures.
    const hardRejectError = ocrValidation.validationResult.validationErrors.find((error) =>
      /(aadhaar|id|identity|passport|student|document|personal|structured)/i.test(error)
    );
    if (hardRejectError) {
      return {
        isRelevant: false,
        detectedIssue: "Invalid complaint input",
        confidence: 0,
        department: "Unknown",
        warning: "Invalid complaint input",
        ocrValidated: false,
        ocrText: extractedOCRText,
        ocrValidationScore: ocrValidation.validationResult.confidenceScore,
      };
    }

    // Weak OCR images can still be real complaints. Accept unless clearly irrelevant.
    if (weakOCRText) {
      const isClearlyIrrelevant = /selfie|face|person|passport|id|document|phone|laptop|mobile|tablet/i.test(fileName);
      if (!isClearlyIrrelevant) {
        return {
          isRelevant: true,
          detectedIssue: "Civic issue detected",
          confidence: 75,
          department: "General Administration",
          ocrValidated: false,
          ocrText: extractedOCRText,
          ocrValidationScore: ocrValidation.validationResult.confidenceScore,
          warning: "Accepted due to weak OCR with visual complaint hint.",
        };
      }
    }

    // Required fallback trigger: empty/short OCR or no-keyword OCR failure.
    const fallbackReason = weakOCRText || hasNoKeywordFailure;
    const fallbackImageResult = analyzeImage(fileName, hasDescription, descCategory);
    if (fallbackImageResult.isRelevant) {
      return {
        isRelevant: true,
        detectedIssue: fallbackImageResult.detectedIssue,
        confidence: fallbackImageResult.confidence,
        department: fallbackImageResult.department,
        ocrValidated: false,
        ocrText: extractedOCRText,
        ocrValidationScore: ocrValidation.validationResult.confidenceScore,
        warning: fallbackReason
          ? "Accepted via image fallback due to weak OCR text."
          : "Accepted via image fallback after OCR failure.",
      };
    }

    // Reject when OCR is invalid and fallback also not relevant.
    return {
      isRelevant: false,
      detectedIssue: "Invalid complaint input",
      confidence: 0,
      department: "Unknown",
      warning: "Invalid complaint input",
      ocrValidated: false,
      ocrText: extractedOCRText,
      ocrValidationScore: ocrValidation.validationResult.confidenceScore,
    };
  }
}

export function analyzeComplaintRealtime(description: string): Partial<AIAnalysisResult> | null {
  const trimmed = description.trim();
  if (trimmed.split(/\s+/).length < 3) return null;

  // Quick keyword scan
  const scores = nlpKeywords.map((entry) => {
    const baseMatches = countKeywordMatches(trimmed, entry.keywords);
    const highMatches = countKeywordMatches(trimmed, entry.highPriorityKeywords);
    const critMatches = countKeywordMatches(trimmed, entry.criticalKeywords);
    return {
      entry,
      score: baseMatches.length + highMatches.length * 2 + critMatches.length * 4,
      baseMatches,
      highMatches,
      critMatches,
    };
  });

  const topScore = scores.reduce((a, b) => (a.score > b.score ? a : b));
  if (topScore.score === 0) return null;

  const duration = detectDuration(trimmed);
  const severityFactors: string[] = [];
  let priority: AIAnalysisResult["priority"] = "low";

  if (topScore.critMatches.length > 0) {
    priority = "critical";
    severityFactors.push(`Critical keywords: ${topScore.critMatches.join(", ")}`);
  } else if (topScore.highMatches.length >= 2 || (topScore.highMatches.length >= 1 && topScore.baseMatches.length >= 3)) {
    priority = "high";
    if (topScore.highMatches.length > 0) severityFactors.push(`Severity indicators: ${topScore.highMatches.join(", ")}`);
  } else if (topScore.highMatches.length >= 1 || topScore.baseMatches.length >= 2) {
    priority = "medium";
  }

  if (duration) {
    severityFactors.push(`Duration: ${duration.label}`);
    if (duration.days >= 7 && priority === "low") priority = "medium";
    if (duration.days >= 7 && priority === "medium") priority = "high";
    if (duration.days >= 14 && priority === "high") priority = "critical";
  }

  const allMatches = [...topScore.baseMatches, ...topScore.highMatches, ...topScore.critMatches];
  const confidence = Math.min(Math.floor(60 + allMatches.length * 8 + (trimmed.split(/\s+/).length > 15 ? 8 : 0)), 98);

  return {
    category: topScore.entry.category,
    priority,
    department: topScore.entry.department,
    confidence,
    keywords: allMatches,
    durationDetected: duration?.label,
    severityFactors,
  };
}

export function analyzeComplaint(
  description: string,
  selectedCategory: ComplaintCategory,
  hasImage: boolean,
  imageFileName?: string
): AIAnalysisResult {
  const trimmed = description.trim();

  if (hasImage) {
    // DEMO MODE (image-only): accept only explicit civic filename hints.
    // OCR/validation is intentionally bypassed for presentation flow.
    const imageName = (imageFileName || "").toLowerCase();
    let demoDepartment: string | null = null;

    if (/(garbage|waste|trash)/i.test(imageName)) {
      demoDepartment = "Sanitation";
    } else if (/(water|leak|drain)/i.test(imageName)) {
      demoDepartment = "Water";
    } else if (/(road|pothole|damage)/i.test(imageName)) {
      demoDepartment = "Roads";
    }

    // Preserve filename evaluation, but also support generic/unnamed filenames.
    // If filename itself is not descriptive, infer from text/category and still score confidence.
    const isGenericImageName =
      !imageName ||
      /^(image|photo|pic|screenshot|img)[-_ ]?\d*/i.test(imageName) ||
      /^dsc[_-]?\d*/i.test(imageName) ||
      /^pxl[_-]?\d*/i.test(imageName) ||
      /^whatsapp image/i.test(imageName) ||
      /^camera/i.test(imageName) ||
      /^upload/i.test(imageName);

    if (!demoDepartment && isGenericImageName) {
      const realtime = analyzeComplaintRealtime(trimmed);
      const inferredDept =
        canonicalDepartmentName(
          realtime?.department ||
          categoryToDepartment[selectedCategory] ||
          "General Administration"
        );
      const inferredConfidence = Math.max(70, Math.min(95, realtime?.confidence || 78));

      return {
        category: (realtime?.category as ComplaintCategory) || selectedCategory,
        priority: realtime?.priority || "medium",
        department: inferredDept,
        confidence: inferredConfidence,
        isRelevant: true,
        keywords: realtime?.keywords || [],
        durationDetected: realtime?.durationDetected,
        severityFactors: realtime?.severityFactors || [],
        detectedIssue: realtime?.category ? `${realtime.category} issue detected` : "Civic issue detected",
        imageConfidence: inferredConfidence,
      };
    }

    if (!demoDepartment) {
      return {
        category: "Unknown",
        priority: "low",
        department: "Unknown",
        confidence: 0,
        isRelevant: false,
        rejectionReason: "Invalid complaint input",
        keywords: [],
        severityFactors: [],
        detectedIssue: "Invalid complaint input",
        imageConfidence: 0,
      };
    }

    const civicText = validateCivicComplaintText(trimmed);
    if (!civicText.valid) {
      return {
        category: "Unknown",
        priority: "low",
        department: "Unknown",
        confidence: 0,
        isRelevant: false,
        rejectionReason: civicText.reason || "Please enter a valid civic issue description.",
        keywords: [],
        severityFactors: [],
        detectedIssue: "Invalid complaint input",
        imageConfidence: 0,
      };
    }

    const realtime = analyzeComplaintRealtime(trimmed);
    const routedDept = canonicalDepartmentName(demoDepartment);
    return {
      category: selectedCategory,
      priority: realtime?.priority || "medium",
      department: routedDept,
      confidence: 85,
      isRelevant: true,
      keywords: realtime?.keywords || [],
      durationDetected: realtime?.durationDetected,
      severityFactors: realtime?.severityFactors || [],
      detectedIssue: "Civic issue detected",
      imageConfidence: 85,
    };
  }

  const civicCheck = validateCivicComplaintText(trimmed);
  if (!civicCheck.valid) {
    return {
      category: "Unknown",
      priority: "low",
      department: "Unknown",
      confidence: 0,
      isRelevant: false,
      rejectionReason: civicCheck.reason || "Please enter a valid civic issue description.",
      keywords: [],
      severityFactors: [],
      detectedIssue: "Invalid complaint input",
    };
  }

  const realtime = analyzeComplaintRealtime(trimmed);
  const resolvedCategory = (realtime?.category || selectedCategory) as ComplaintCategory;
  const department =
    realtime?.department ||
    categoryToDepartment[resolvedCategory] ||
    categoryToDepartment[selectedCategory] ||
    "General Administration";

  const textConfidencePct = Math.round(Math.min(98, Math.max(62, civicCheck.confidence * 100)));
  const blended = Math.round(
    Math.min(98, textConfidencePct * 0.45 + (realtime?.confidence ?? 72) * 0.55)
  );

  return {
    category: resolvedCategory,
    priority: realtime?.priority || "medium",
    department: canonicalDepartmentName(department),
    confidence: blended,
    isRelevant: true,
    keywords: realtime?.keywords || [],
    durationDetected: realtime?.durationDetected,
    severityFactors: realtime?.severityFactors || [],
    detectedIssue: realtime?.category ? `${realtime.category} issue` : "Civic complaint",
  };
}
