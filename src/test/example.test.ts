import { describe, it, expect } from "vitest";
import { classifyComplaintInput } from "@/lib/aiAnalysis";

describe("AI complaint classification", () => {
  it("should return Invalid complaint input for academic/PPT text", () => {
    expect(classifyComplaintInput("This is a PPT slide on urban planning and not a real complaint")).toBe("Invalid complaint input");
    expect(classifyComplaintInput("Random notes for class assignment")).toBe("Invalid complaint input");
  });

  it("should return Irrelevant content for vague text", () => {
    expect(classifyComplaintInput("The area is bad and needs change")).toBe("Irrelevant content");
    expect(classifyComplaintInput("No water")).toBe("Irrelevant content");
  });

  it("should return Valid complaint for clear civic issue", () => {
    expect(classifyComplaintInput("There is a large pothole on Main Street causing vehicle damage." )).toBe("Valid complaint");
    expect(classifyComplaintInput("Garbage heap near the market is stuck for 2 weeks and stinks.")).toBe("Valid complaint");
  });
});
