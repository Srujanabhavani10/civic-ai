/**
 * Civic complaint text validation — keyword + token-overlap "semantic" scoring (no external API).
 * Rejects meaningless input; accepts descriptions that align with public-works issues.
 */

const MIN_WORDS = 4;
const MIN_CONFIDENCE = 0.5;

const trivialPatterns = [
  /^(hi|hello|hey|yo|sup|test|testing|abc|xyz|asdf|qwerty|lorem|foo|bar)\b/i,
  /^[0-9\s\-_.]+$/,
  /^(.)\1{4,}$/i,
];

const stopWords = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "as", "by",
  "with", "from", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can",
  "this", "that", "these", "those", "it", "there", "here", "very", "just", "also", "only",
  "please", "help", "need", "want", "my", "our", "me", "us", "i", "you", "he", "she", "they",
]);

/** Reference token bags — broad civic vocabulary (garbage, water, roads, power, drainage). */
const CIVIC_REFERENCE_SETS: string[][] = [
  "garbage waste trash litter rubbish dump bin cleaning sweep sanitation sewage smell stink filth dirty flies rats pest unhygienic rotting market street".split(
    " "
  ),
  "water leak leaking leaks leaked pipeline pipe tap burst supply pressure drainage drain draining flooded flood sewer manhole overflow stagnant gutter mosquito".split(" "),
  "road pothole crack damage asphalt pavement highway footpath sidewalk bump uneven accident traffic".split(" "),
  "electricity power streetlight lamp pole outage blackout wire cable shock sparking transformer current voltage light dark night".split(" "),
  "drainage blocked clogged waterlogging manhole collapse danger mosquito".split(" "),
  "bus transport traffic congestion parking vehicle delay commute".split(" "),
];

const complaintVerbs =
  /\b(leak|leaking|leaks|leaked|broken|damage|damaged|damages|blocked|blocking|clog|clogged|overflow|overflowing|not\s*working|fail|repair|fix|clear|clean|hazard|unsafe|danger|serious|problem|issue)\b/i;

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenizeMeaningful(text: string): string[] {
  const words = normalizeText(text).match(/\b[a-z]{2,}\b/g) || [];
  return words.filter((w) => !stopWords.has(w));
}

/** Add simple stem variants so "leaking" matches ref token "leak", etc. */
function expandTokensForScoring(tokens: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const w of tokens) {
    out.add(w);
    if (w.endsWith("ing") && w.length > 4) out.add(w.slice(0, -3));
    if (w.endsWith("ing") && w.length > 5) out.add(w.slice(0, -4));
    if (w.endsWith("ed") && w.length > 3) out.add(w.slice(0, -2));
    if (w.endsWith("ed") && w.length > 4) out.add(w.slice(0, -1));
    if (w.endsWith("s") && w.length > 3) out.add(w.slice(0, -1));
  }
  return out;
}

/** Extra boost when a civic root appears inside a longer word (e.g. leakage). */
function substringRefHits(text: string, refWords: string[]): number {
  const lower = normalizeText(text);
  let hits = 0;
  for (const r of refWords) {
    if (r.length < 4) continue;
    if (lower.includes(r)) hits++;
  }
  return hits;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

function longestConsonantRun(text: string): number {
  const m = text.toLowerCase().match(/[bcdfghjklmnpqrstvwxyz]+/g);
  if (!m) return 0;
  return Math.max(...m.map((s) => s.length));
}

export interface CivicTextValidationResult {
  valid: boolean;
  confidence: number;
  reason?: string;
}

/**
 * Returns confidence in [0, 1]. Valid only if confidence >= MIN_CONFIDENCE.
 */
export function validateCivicComplaintText(description: string): CivicTextValidationResult {
  const raw = description.trim();
  if (!raw) {
    return { valid: false, confidence: 0, reason: "Please enter a valid civic issue description." };
  }

  const wordCount = raw.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORDS) {
    return { valid: false, confidence: 0, reason: "Please enter a valid civic issue description." };
  }

  if (!/[a-zA-Z]/.test(raw)) {
    return { valid: false, confidence: 0, reason: "Please enter a valid civic issue description." };
  }

  for (const p of trivialPatterns) {
    if (p.test(raw)) {
      return { valid: false, confidence: 0, reason: "Please enter a valid civic issue description." };
    }
  }

  const letters = raw.replace(/[^a-zA-Z]/g, "");
  const alphaRatio = letters.length / Math.max(raw.length, 1);
  if (letters.length < 12 || alphaRatio < 0.35) {
    return { valid: false, confidence: 0, reason: "Please enter a valid civic issue description." };
  }

  if (longestConsonantRun(raw) >= 6) {
    return { valid: false, confidence: 0, reason: "Please enter a valid civic issue description." };
  }

  const inputTokens = expandTokensForScoring(tokenizeMeaningful(raw));
  if (inputTokens.size < 2) {
    return { valid: false, confidence: 0, reason: "Please enter a valid civic issue description." };
  }

  const allRefTokens = new Set(CIVIC_REFERENCE_SETS.flat());

  let maxOverlap = 0;
  for (const refWords of CIVIC_REFERENCE_SETS) {
    const refSet = new Set(refWords);
    maxOverlap = Math.max(maxOverlap, jaccard(inputTokens, refSet));
    for (const w of refWords) {
      if (inputTokens.has(w)) maxOverlap = Math.max(maxOverlap, 0.28);
    }
  }

  const civicSubstringHits = substringRefHits(raw, [...allRefTokens]);
  const substringBoost = Math.min(0.35, civicSubstringHits * 0.12);

  const verbBoost = complaintVerbs.test(raw) ? 0.18 : 0;
  const lengthBoost = Math.min(0.22, (wordCount - MIN_WORDS) * 0.012);
  let confidence = Math.min(1, maxOverlap * 0.92 + verbBoost + lengthBoost + substringBoost);

  if (confidence < MIN_CONFIDENCE) {
    return {
      valid: false,
      confidence: Number(confidence.toFixed(2)),
      reason: "Please enter a valid civic issue description.",
    };
  }

  return { valid: true, confidence: Number(confidence.toFixed(2)) };
}
