/**
 * 2-STAGE AI COMPLAINT ANALYSIS SYSTEM
 * =====================================
 * STAGE 1: STRICT VALIDATION (Reject irrelevant inputs)
 * STAGE 2: CLASSIFICATION (Classify valid complaints)
 *
 * Every input MUST pass Stage 1 validation before Stage 2 classification
 */

/**
 * Stage 1 Response: Validation Result
 * Used when input is rejected during validation
 */
export interface ValidationRejection {
  status: "Invalid complaint input";
  reason: string;
}

/**
 * Stage 2 Response: Classification Result
 * Used when input passes validation and is classified
 */
export interface ClassificationResult {
  status: "Valid complaint";
  department: "Roads" | "Water" | "Electricity" | "Sanitation" | "Transport" | "General";
  confidence: number;
  summary: string;
}

/**
 * Union type for final response
 */
export type ComplaintAnalysisResponse = ValidationRejection | ClassificationResult;

/**
 * Internal validation result (not exposed to user)
 */
export interface OCRValidationResult {
  isValid: boolean;
  extractedText: string;
  validationErrors: string[];
  confidenceScore: number;
  complaint_signal_strength: "strong" | "medium" | "weak" | "none";
}

export interface OCRExtractionResult {
  text: string;
  confidence: number;
}

const MIN_WORDS = 5;
const MIN_CONFIDENCE = 0.85;

const complaintKeywordPatterns = [
  /\b(problem|issue|complaint|broken|damage|damaged|defect|fault|unsafe|hazard)\b/i,
  /\b(leak|leaking|flood|overflow|burst|clog|blocked|drain|drainage|sewage)\b/i,
  /\b(garbage|waste|trash|litter|filth|dirty|unclean|stink|smell)\b/i,
  /\b(not\s*working|not\s*functioning|power\s*cut|blackout|outage|streetlight)\b/i,
  /\b(pothole|road\s*damage|crack|repair|fix|maintenance)\b/i,
];

const structuredFieldPatterns = [
  /\b(name|father'?s?\s*name|dob|date\s*of\s*birth|gender|address)\b[\s:]/i,
  /\b(course|branch|semester|roll\s*number|enrollment|registration\s*number)\b[\s:]/i,
  /\b(validity|valid\s*till|issued|issue\s*date|expiry|signature)\b[\s:]/i,
  /\b(aadhaar|aadhar|passport|identity\s*card|student\s*id|id\s*number)\b/i,
];

function hasComplaintKeywords(text: string): boolean {
  return complaintKeywordPatterns.some((pattern) => pattern.test(text));
}

/**
 * ==========================================
 * STAGE 1: VALIDATION LAYER - STRICT RULES
 * ==========================================
 * Rejects ANY input matching these criteria:
 * - Personal documents (ID, Aadhaar, passport, student card)
 * - Personal identity information (name, roll number, photo)
 * - Academic content (PPT, notes, assignment, homework)
 * - Non-complaint content (no issue keywords)
 * - Insufficient detail or signal
 */

const personalDocumentPatterns = [
  // ID/Aadhaar/Passport patterns
  { regex: /\b(aadhar|aadhaar|adhaar|aadh|national\s*id|identity\s*card)\b/i, reason: "Aadhaar/National ID detected" },
  { regex: /\b(passport|visa|travel\s*document)\b/i, reason: "Passport document detected" },
  { regex: /\b(driver.{0,3}license|dl\s*number|driving\s*license)\b/i, reason: "Driver's license detected" },
  { regex: /\b(student\s*id|student\s*card|roll\s*number|enrollment|registration\s*number)\b/i, reason: "Student ID detected" },
  { regex: /\b(institute|college|university|course|branch|validity|issued|principal)\b/i, reason: "Student ID card detected" },
  { regex: /\b(PAN|income\s*tax|social\s*security|ssn|taxpayer)\b/i, reason: "Tax/Financial document detected" },
  
  // Personal info patterns
  { regex: /\b(date\s*of\s*birth|dob|born|age[\s:])/i, reason: "Personal DOB/Age information detected" },
  { regex: /\b(photo|selfie|profile\s*picture|portrait)\b/i, reason: "Personal photo detected" },
  { regex: /\bname[\s:]/i, reason: "Personal name information detected" },
  
  // Academic/Assignment patterns
  { regex: /\b(assignment|homework|project|exam|test|quiz|class)\s*(submission|work|report|solution)\b/i, reason: "Academic assignment detected" },
  { regex: /\b(professor|instructor|faculty|teacher|student|coursework)\b/i, reason: "Academic content detected" },
  { regex: /\b(lecture|notes|textbook|chapter|syllabus)\b/i, reason: "Educational material detected" },
];

/**
 * Detects if text contains personal document/identity information
 * STRICT: err on side of rejection
 */
function detectPersonalDocument(text: string): { isPersonalDoc: boolean; reason?: string } {
  const lower = text.toLowerCase();
  
  for (const pattern of personalDocumentPatterns) {
    if (pattern.regex.test(lower)) {
      return { isPersonalDoc: true, reason: pattern.reason };
    }
  }
  
  // Check for ID-card-like structure: text blocks with common identity fields
  const identityFieldPatterns = [
    /number[\s:]/i,
    /issued[\s:]/i,
    /expir/i,
    /valid\s*till/i,
    /signature/i,
    /thumbprint/i,
    /gender[\s:]/i,
  ];
  
  const fieldMatches = identityFieldPatterns.filter(p => p.test(lower)).length;
  if (fieldMatches >= 3) {
    return { isPersonalDoc: true, reason: "ID document layout detected" };
  }
  
  return { isPersonalDoc: false };
}

/**
 * =====================
 * STAGE 1: VALIDATION
 * =====================
 * RETURNS: ValidationRejection if invalid
 */
function validateComplaintInput(text: string): { valid: boolean; reason?: string } {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  
  // Check 1: Personal document detection (STRICT)
  const personalDocCheck = detectPersonalDocument(trimmed);
  if (personalDocCheck.isPersonalDoc) {
    return { valid: false, reason: personalDocCheck.reason };
  }
  
  const words = trimmed.split(/\s+/).filter(Boolean);

  // Check 2: minimum descriptive words
  if (words.length < MIN_WORDS) {
    return { valid: false, reason: "Insufficient descriptive content" };
  }
  
  // Check 3: PPT/Notes/Academic content
  const academicPatterns = [
    /\b(ppt|powerpoint|slide|presentation|deck)\b/i,
    /\b(class\s*notes|lecture\s*notes|study\s*notes)\b/i,
    /\b(lorem\s*ipsum|dummy\s*text|sample\s*text|placeholder)\b/i,
    /\b(asdf|qwerty|test\s*text|random\s*text)\b/i,
  ];
  
  for (const pattern of academicPatterns) {
    if (pattern.test(lower)) {
      return { valid: false, reason: "Not a complaint / irrelevant image" };
    }
  }
  
  // Check 4: complaint keywords are mandatory
  const hasComplaintSignal = hasComplaintKeywords(lower);
  if (!hasComplaintSignal) {
    return { valid: false, reason: "Not a complaint / irrelevant image" };
  }
  
  return { valid: true };
}


/**
 * Validates OCR-extracted text against strict requirements
 * 1. Text length >= 20 characters
 * 2. Not academic, ID card, notes, PPT, or random content
 * 3. Describes a real-world problem/complaint
 */
export function validateOCRText(extractedText: string): OCRValidationResult {
  const trimmed = extractedText.trim();
  const lower = trimmed.toLowerCase();
  const validationErrors: string[] = [];
  let confidenceScore: number = 1.0;
  let complaint_signal_strength: "strong" | "medium" | "weak" | "none" = "none";

  const words = trimmed.split(/\s+/).filter(Boolean);

  // 1) Minimum descriptive words required
  if (words.length < MIN_WORDS) {
    validationErrors.push(`Insufficient descriptive content (${words.length} words, need ${MIN_WORDS}+)`);
    confidenceScore -= 0.5;
  }

  // 2. Reject irrelevant content patterns
  const irrelevantPatterns = [
    { regex: /\b(ID\s*card|identity|passport|driver.{0,3}license|national\s*id)\b/i, reason: "ID/Identity document detected" },
    { regex: /\b(PPT|presentation|slide|deck)\b/i, reason: "Presentation content detected" },
    { regex: /\b(notes|notes|notes|class\s*notes|lecture|assignment|homework)\b/i, reason: "Academic notes content detected" },
    { regex: /\b(lorem\s*ipsum|dummy\s*text|sample\s*text|test\s*data|placeholder)\b/i, reason: "Dummy/placeholder text detected" },
    { regex: /^[a-zA-Z0-9]{5,}$/, reason: "Random alphanumeric string, no real content" },
    { regex: /(.)\1{4,}/, reason: "Repetitive characters detected" },
    { regex: /^\d+$/, reason: "Only numbers, no descriptive content" },
    { regex: /\b(phone|mobile|laptop|headphone|charger|keyboard|mouse|tablet)\b/i, reason: "Random object content detected" },
  ];

  for (const pattern of irrelevantPatterns) {
    if (pattern.regex.test(trimmed)) {
      validationErrors.push(pattern.reason);
      confidenceScore -= 0.3;
    }
  }

  // 2b) Structured document field detection (ID card/document style)
  const structuredFieldHits = structuredFieldPatterns.filter((pattern) => pattern.test(lower)).length;
  if (structuredFieldHits >= 2) {
    validationErrors.push("Structured personal/academic document fields detected");
    confidenceScore -= 0.5;
  }

  // 3. Detect complaint signals (strong, medium, weak, none)
  const complexPlaintSignals = {
    strong: [
      /\b(broken|damaged|not\s*working|faulty|defective|malfunction|crash|collapse)\b/i,
      /\b(danger|hazard|unsafe|risk|accident|injury|harm|threat)\b/i,
      /\b(urgent|immediate|critical|emergency|severe|serious)\b/i,
      /\b(leak|flood|overflow|block|clog|rupture|burst)\b/i,
      /\b(garbage|waste|trash|litter|filth|dump|sewage)\b/i,
    ],
    medium: [
      /\b(problem|issue|complaint|concern|trouble|difficult|hard)\b/i,
      /\b(road|pothole|pavement|street|highway|pathway|sidewalk)\b/i,
      /\b(water|pipe|electricity|power|light|drainage)\b/i,
      /\b(repair|fix|maintenance|service|improve|upgrade)\b/i,
      /\b(need|require|must|should|urgent|request)\b/i,
    ],
    weak: [
      /\b(bad|poor|slow|delay|wait|late|congestion)\b/i,
      /\b(dirty|messy|untidy|unkempt)\b/i,
      /\b(area|location|place|spot|zone|neighborhood)\b/i,
    ],
  };

  let strongMatches = 0;
  let mediumMatches = 0;
  let weakMatches = 0;

  for (const pattern of complexPlaintSignals.strong) {
    if (pattern.test(trimmed)) {
      strongMatches++;
    }
  }

  for (const pattern of complexPlaintSignals.medium) {
    if (pattern.test(trimmed)) {
      mediumMatches++;
    }
  }

  for (const pattern of complexPlaintSignals.weak) {
    if (pattern.test(trimmed)) {
      weakMatches++;
    }
  }

  // Determine complaint signal strength
  // Boost: issue keyword + strong signal = strong
  const issueKeywords = ["pothole", "garbage", "trash", "leak", "water", "drain", "streetlight", "power", "electric", "hazard", "flood", "sewage"];
  const hasIssueKeyword = issueKeywords.some((kw) => lower.includes(kw));
  
  if (strongMatches >= 2 || (strongMatches >= 1 && mediumMatches >= 2) || (strongMatches >= 1 && hasIssueKeyword)) {
    complaint_signal_strength = "strong";
    confidenceScore += 0.4;
  } else if (strongMatches >= 1 || mediumMatches >= 3) {
    complaint_signal_strength = "medium";
    confidenceScore += 0.2;
  } else if (mediumMatches >= 2 || weakMatches >= 3) {
    complaint_signal_strength = "weak";
    confidenceScore += 0.1;
  } else {
    complaint_signal_strength = "none";
    validationErrors.push("No complaint/issue signal detected in text");
    confidenceScore -= 0.5;
  }

  // 4) Mandatory complaint keyword presence
  const hasMandatoryComplaintKeyword = hasComplaintKeywords(lower);
  if (!hasMandatoryComplaintKeyword) {
    validationErrors.push("No complaint-related keywords detected");
    confidenceScore -= 0.6;
  }

  // 5) Character length still enforced as secondary quality control
  if (trimmed.length < 20) {
    validationErrors.push(`Text too short (${trimmed.length} chars, need 20+)`);
    confidenceScore -= 0.2;
  }

  // 6. Ensure text is not mostly generic filler
  const genericWords = ["the", "a", "an", "is", "are", "was", "were", "this", "that", "it"];
  const genericCount = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => genericWords.includes(w)).length;
  const contentRatio = words.length > 0 ? (words.length - genericCount) / words.length : 0;

  if (contentRatio < 0.5) {
    validationErrors.push("Text is mostly generic filler words");
    confidenceScore -= 0.3;
  }

  // Clamp confidence score between 0 and 1
  confidenceScore = Math.max(0, Math.min(1, confidenceScore));

  const isValid = validationErrors.length === 0 && complaint_signal_strength !== "none" && confidenceScore >= MIN_CONFIDENCE;

  return {
    isValid,
    extractedText: trimmed,
    validationErrors,
    confidenceScore: parseFloat(confidenceScore.toFixed(2)),
    complaint_signal_strength,
  };
}

/**
 * Detects complaint relevance from OCR text
 * Returns true if text clearly describes a real complaint
 */
export function detectComplaintRelevance(text: string): boolean {
  const validation = validateOCRText(text);
  return validation.isValid && validation.complaint_signal_strength !== "none";
}

/**
 * Applies confidence threshold filtering
 * Only allows complaints with confidence >= 0.85
 */
export function applyConfidenceThreshold(validationResult: OCRValidationResult, threshold: number = 0.85): {
  isApproved: boolean;
  confidence: number;
  reason?: string;
} {
  if (validationResult.confidenceScore >= threshold) {
    return {
      isApproved: true,
      confidence: validationResult.confidenceScore,
    };
  }

  return {
    isApproved: false,
    confidence: validationResult.confidenceScore,
    reason: `Confidence too low (${(validationResult.confidenceScore * 100).toFixed(1)}%, need ${threshold * 100}%)`,
  };
}

/**
 * Comprehensive OCR validation pipeline
 * Extracts → Validates → Applies confidence threshold
 * Returns "Invalid complaint input" if any step fails
 */
export function validateComplaintImageOCR(
  extractedOCRText: string,
  confidenceThreshold: number = MIN_CONFIDENCE
): {
  isValid: boolean;
  message: string;
  validationResult: OCRValidationResult;
  thresholdApproval: ReturnType<typeof applyConfidenceThreshold>;
} {
  // Step 0: Always reject personal documents first
  const personalDocCheck = detectPersonalDocument(extractedOCRText);
  if (personalDocCheck.isPersonalDoc) {
    const rejectionResult: OCRValidationResult = {
      isValid: false,
      extractedText: extractedOCRText,
      validationErrors: [personalDocCheck.reason || "Personal document detected"],
      confidenceScore: 0,
      complaint_signal_strength: "none",
    };

    return {
      isValid: false,
      message: "Invalid complaint input",
      validationResult: rejectionResult,
      thresholdApproval: { isApproved: false, confidence: 0, reason: personalDocCheck.reason },
    };
  }

  // Step 1: Validate extracted text
  const validationResult = validateOCRText(extractedOCRText);

  if (!validationResult.isValid) {
    return {
      isValid: false,
      message: "Invalid complaint input",
      validationResult,
      thresholdApproval: { isApproved: false, confidence: 0 },
    };
  }

  // Step 2: Apply confidence threshold
  const thresholdApproval = applyConfidenceThreshold(validationResult, confidenceThreshold);

  if (!thresholdApproval.isApproved) {
    return {
      isValid: false,
      message: "Invalid complaint input",
      validationResult,
      thresholdApproval,
    };
  }

  return {
    isValid: true,
    message: "Valid complaint detected",
    validationResult,
    thresholdApproval,
  };
}

/**
 * =====================
 * STAGE 2: CLASSIFICATION
 * =====================
 * Classifies valid complaints into departments
 * Returns department assignment + confidence score
 */
function classifyComplaintToDepartment(
  text: string
): {
  department: "Roads" | "Water" | "Electricity" | "Sanitation" | "Transport" | "General";
  confidence: number;
  summary: string;
} {
  const lower = text.toLowerCase();
  
  // Department-specific keyword patterns
  const departmentPatterns = {
    Roads: {
      keywords: /\b(pothole|road|pavement|asphalt|highway|path|street|crack|bump|broken\s*road|damaged\s*road|roadway)\b/i,
      confidence: 0.9,
    },
    Water: {
      keywords: /\b(water|pipe|leak|overflow|drainage|drain|flood|wet|supply|tap|burst|clogged|sewage|stagnant)\b/i,
      confidence: 0.9,
    },
    Electricity: {
      keywords: /\b(electricity|power|light|streetlight|lamp|pole|electric|current|voltage|blackout|outage|switch|wire|cable|shock)\b/i,
      confidence: 0.9,
    },
    Sanitation: {
      keywords: /\b(garbage|waste|trash|litter|filth|dump|dirty|cleaning|sweeping|sanitation|flies|rats|pest|smell|stink|unclean)\b/i,
      confidence: 0.9,
    },
    Transport: {
      keywords: /\b(bus|traffic|transport|vehicle|car|road\s*accident|congestion|delay|commute|parking)\b/i,
      confidence: 0.85,
    },
  };
  
  // Score each department
  let bestMatch: "Roads" | "Water" | "Electricity" | "Sanitation" | "Transport" | "General" = "General";
  let bestScore = 0;
  
  for (const [dept, pattern] of Object.entries(departmentPatterns)) {
    if (pattern.keywords.test(lower)) {
      bestMatch = dept as "Roads" | "Water" | "Electricity" | "Sanitation" | "Transport";
      bestScore = pattern.confidence;
      break; // First match wins for efficiency
    }
  }
  
  // Generate summary
  const summaryMatch = text.match(/([^.!?]{20,100}[.!?])/);
  const summary = summaryMatch
    ? summaryMatch[1].trim().substring(0, 100)
    : text.substring(0, 100) + (text.length > 100 ? "..." : "");
  
  return {
    department: bestMatch,
    confidence: bestScore,
    summary,
  };
}

/**
 * =========================================
 * MAIN FUNCTION: 2-STAGE ANALYSIS SYSTEM
 * =========================================
 *
 * STAGE 1: Validates input (rejects irrelevant)
 * STAGE 2: Classifies valid complaints
 *
 * RETURNS: { status, ... } in exact format specified
 *
 * STRICT RULES:
 * - NEVER classify ID cards or personal documents
 * - NEVER guess
 * - PRIORITIZE rejection over wrong classification
 * - If confidence < 0.85 → Reject
 */
export function analyzeComplaint(extractedText: string): ComplaintAnalysisResponse {
  return {
    status: "Invalid complaint input",
    reason: "Deprecated pipeline. Use analyzeImageWithOCR() only.",
  };
}

/**
 * Simulates OCR extraction (placeholder for tesseract.js integration)
 * In production, replace this with actual tesseract.js call:
 *
 * import Tesseract from 'tesseract.js';
 *
 * export async function extractOCRTextFromImage(imageUrl: string): Promise<OCRExtractionResult> {
 *   const result = await Tesseract.recognize(imageUrl, 'eng');
 *   return {
 *     text: result.data.text,
 *     confidence: result.data.confidence / 100,
 *   };
 * }
 */
export async function extractOCRTextFromImage(imageUrl: string): Promise<OCRExtractionResult> {
  // Placeholder implementation
  // TODO: Integrate tesseract.js when network is available

  console.warn("Using placeholder OCR. Install tesseract.js for real OCR extraction.");
  return {
    text: "",
    confidence: 0,
  };
}
