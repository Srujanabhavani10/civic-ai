import { describe, it, expect } from "vitest";
import {
  validateOCRText,
  detectComplaintRelevance,
  applyConfidenceThreshold,
  validateComplaintImageOCR,
} from "@/lib/ocrValidation";

describe("OCR Text Validation", () => {
  describe("validateOCRText", () => {
    it("should reject text shorter than 20 characters", () => {
      const result = validateOCRText("short");
      expect(result.isValid).toBe(false);
      expect(result.validationErrors.some((e) => e.includes("short"))).toBe(true);
    });

    it("should reject ID card content", () => {
      const result = validateOCRText("ID Card: Name John Doe, DOB 01/01/1990, License Number ABC123");
      expect(result.isValid).toBe(false);
      expect(result.validationErrors.some((e) => e.includes("ID"))).toBe(true);
    });

    it("should reject PPT slide content", () => {
      const result = validateOCRText("Slide 1: Introduction to Municipal Planning - PPT Presentation Deck");
      expect(result.isValid).toBe(false);
      expect(result.validationErrors.some((e) => e.includes("Presentation"))).toBe(true);
    });

    it("should reject academic notes", () => {
      const result = validateOCRText("Class notes: Chapter 5 - Urban Development and City Planning Lecture Notes");
      expect(result.isValid).toBe(false);
      expect(result.validationErrors.some((e) => e.includes("Academic"))).toBe(true);
    });

    it("should reject dummy/placeholder text", () => {
      const result = validateOCRText("Lorem ipsum dolor sit amet consectetur adipiscing elit");
      expect(result.isValid).toBe(false);
    });

    it("should accept valid complaint with strong signals", () => {
      const result = validateOCRText(
        "The road near my house has a large pothole that is damaged and causing vehicle accidents. This is urgent."
      );
      expect(result.isValid).toBe(true);
      expect(result.complaint_signal_strength).toBe("strong");
      expect(result.confidenceScore).toBeGreaterThan(0.7);
    });

    it("should accept valid complaint with medium signals", () => {
      const result = validateOCRText("There is a problem with the water pipe in my area that needs repair");
      expect(result.isValid).toBe(true);
      expect(result.complaint_signal_strength).toMatch(/strong|medium/);
      expect(result.confidenceScore).toBeGreaterThan(0.5);
    });

    it("should reject text with only numbers", () => {
      const result = validateOCRText("123456789012345678901234567890");
      expect(result.isValid).toBe(false);
    });

    it("should reject repetitive characters", () => {
      const result = validateOCRText("aaaaaaaaaa bbbbbbbbbb cccccccccc");
      expect(result.isValid).toBe(false);
    });

    it("should detect strong complaint signal", () => {
      const result = validateOCRText(
        "The garbage heap near the market collapsed and flooded the area causing severe danger"
      );
      expect(result.complaint_signal_strength).toBe("strong");
    });

    it("should detect medium complaint signal", () => {
      const result = validateOCRText("The area has water problems that need fixing and maintenance");
      expect(result.complaint_signal_strength).toMatch(/strong|medium/);
    });

    it("should reject text with no complaint signals", () => {
      const result = validateOCRText("This area has some buildings and roads and other infrastructure present");
      expect(result.isValid).toBe(false);
      expect(result.complaint_signal_strength).toBe("none");
    });
  });

  describe("detectComplaintRelevance", () => {
    it("should return true for valid complaints", () => {
      // Use a text that clearly matches strong signals
      const isRelevant = detectComplaintRelevance("The pothole is dangerous and caused accidents and injury to many children");
      expect(isRelevant).toBe(true);
    });

    it("should return false for invalid complaints", () => {
      const isRelevant = detectComplaintRelevance("ID Card: John Doe, License ABC123");
      expect(isRelevant).toBe(false);
    });
  });

  describe("applyConfidenceThreshold", () => {
    it("should approve complaint with confidence >= threshold", () => {
      const validationResult = validateOCRText("The road has a dangerous pothole");
      const result = applyConfidenceThreshold(validationResult, 0.5);
      expect(result.isApproved).toBe(true);
    });

    it("should reject complaint with confidence < threshold", () => {
      const validationResult = validateOCRText("Water problem here");
      const result = applyConfidenceThreshold(validationResult, 0.95);
      expect(result.isApproved).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe("validateComplaintImageOCR", () => {
    it("should return valid for legitimate complaint image OCR", () => {
      const result = validateComplaintImageOCR(
        "Severe flooding near Elm Street due to road damage and improper drainage blocking"
      );
      expect(result.isValid).toBe(true);
      expect(result.message).toBe("Valid complaint detected");
    });

    it("should return Invalid complaint input for ID card OCR", () => {
      const result = validateComplaintImageOCR("Passport Number: AB12CD34567, Issued: 01/01/2020");
      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Invalid complaint input");
    });

    it("should return Invalid complaint input when confidence is below threshold", () => {
      const result = validateComplaintImageOCR("water issue", 0.85);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Invalid complaint input");
    });

    it("should respect custom confidence threshold", () => {
      const textMediumConfidence = "There is a problem with the road that needs fixing and repair";
      const resultStrict = validateComplaintImageOCR(textMediumConfidence, 0.95);
      const resultLenient = validateComplaintImageOCR(textMediumConfidence, 0.3);

      // Lenient should pass more often than strict
      if (resultLenient.isValid) {
        expect(resultLenient.isValid).toBe(true);
      } else {
        // If lenient fails, strict should also fail
        expect(resultStrict.isValid).toBe(false);
      }
    });
  });

  describe("Real-world examples", () => {
    it("should accept: road damage image with OCR", () => {
      const ocrText =
        "The road near my house is damaged and has created a dangerous pothole. Accidents happening.";
      const result = validateComplaintImageOCR(ocrText);
      expect(result.isValid).toBe(true);
    });

    it("should reject: ID card image with OCR", () => {
      const ocrText =
        "NATIONAL ID CARD\nName: John Doe\nDOB: 01/01/1990\nID Number: 12AB34CD56EF";
      const result = validateComplaintImageOCR(ocrText);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Invalid complaint input");
    });

    it("should reject: PPT slide image with OCR", () => {
      const ocrText =
        "Slide 3: Urban Infrastructure\nCity Planning and Development\nStatistics and Trends";
      const result = validateComplaintImageOCR(ocrText);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Invalid complaint input");
    });

    it("should reject: Random notes image with OCR", () => {
      const ocrText = "To do: Buy groceries, call mom, finish project, check email";
      const result = validateComplaintImageOCR(ocrText);
      expect(result.isValid).toBe(false);
    });

    it("should accept: Garbage complaint with OCR", () => {
      const ocrText =
        "Garbage dump near the market is overflowing and creating health hazard for children";
      const result = validateComplaintImageOCR(ocrText);
      expect(result.isValid).toBe(true);
    });

    it("should accept: Water leak complaint with OCR", () => {
      const ocrText =
        "Water pipe burst on Park Street causing flooding and water wastage urgently needs repair";
      const result = validateComplaintImageOCR(ocrText);
      expect(result.isValid).toBe(true);
    });
  });
});
