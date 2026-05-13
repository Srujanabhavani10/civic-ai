/**
 * Canonical department names used across dashboards and mock auth users.
 * Maps short / legacy labels to the same string stored on complaints.
 */

export const CANONICAL_DEPARTMENTS = [
  "Sanitation Department",
  "Water Board",
  "Road Maintenance",
  "Electricity Department",
  "General Administration",
] as const;

const SHORT_TO_CANONICAL: Record<string, string> = {
  Sanitation: "Sanitation Department",
  Water: "Water Board",
  Roads: "Road Maintenance",
  Electricity: "Electricity Department",
  "General Administration": "General Administration",
  General: "General Administration",
};

/**
 * Normalize any department label (demo short name or full name) to canonical form.
 */
export function canonicalDepartmentName(department: string): string {
  const t = department.trim().replace(/\s+/g, " ");
  const lower = t.toLowerCase();

  // 1) If input already equals a canonical department (case-insensitive), normalize to the canonical spelling.
  for (const canonical of CANONICAL_DEPARTMENTS) {
    if (canonical.toLowerCase() === lower) return canonical;
  }

  // 2) Map known short/legacy names to canonical spelling (case-insensitive).
  for (const [k, v] of Object.entries(SHORT_TO_CANONICAL)) {
    const key = k.trim().replace(/\s+/g, " ").toLowerCase();
    if (key === lower) return v;
  }

  return t;
}

/** Category → default routing department (aligns with api.ts mock mapping). */
export const categoryToDepartment: Record<string, string> = {
  Sanitation: "Sanitation Department",
  "Water Supply": "Water Board",
  "Road Damage": "Road Maintenance",
  Drainage: "Sanitation Department",
  "Street Light": "Electricity Department",
  Electricity: "Electricity Department",
  Other: "General Administration",
};
