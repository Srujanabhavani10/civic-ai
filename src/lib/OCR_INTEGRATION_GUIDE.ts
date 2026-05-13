/**
 * OCR VALIDATION INTEGRATION GUIDE
 * ================================
 *
 * This file demonstrates how to use the OCR validation layer
 * in your image complaint analysis pipeline.
 */

/**
 * QUICK START: Integration in React Component
 * ============================================
 *
 * 1. Import the validation functions
 */

import { validateComplaintImageOCR, validateOCRText, applyConfidenceThreshold } from "@/lib/ocrValidation";
import { analyzeImageWithOCR } from "@/lib/aiAnalysis";

/**
 * 2. When user uploads an image:
 *
 * Step A: Extract text from image (using tesseract.js or external OCR API)
 * Step B: Validate the extracted text
 * Step C: Only proceed with classification if validation passes
 */

/**
 * EXAMPLE 1: Simple Text Validation
 * ==================================
 */

function exampleSimpleValidation() {
  // Simulate OCR extraction from image
  const extractedText = "The road near my house has a large pothole causing accidents";

  // Validate the text
  const validationResult = validateOCRText(extractedText);

  console.log("Is Valid:", validationResult.isValid);
  console.log("Confidence Score:", validationResult.confidenceScore);
  console.log("Signal Strength:", validationResult.complaint_signal_strength);
  console.log("Errors:", validationResult.validationErrors);

  if (!validationResult.isValid) {
    console.log("Rejected: Invalid complaint input");
    return;
  }

  if (validationResult.confidenceScore < 0.85) {
    console.log("Rejected: Confidence too low");
    return;
  }

  console.log("Accepted: Valid complaint");
}

/**
 * EXAMPLE 2: Complete Pipeline Validation
 * ========================================
 */

function exampleCompletePipeline() {
  const extractedText = "The garbage heap near the market is overflowing and stinking";

  // One-step validation with confidence threshold
  const result = validateComplaintImageOCR(extractedText, 0.85);

  if (result.isValid) {
    console.log("✓ Complaint passed OCR validation");
    console.log("Confidence:", result.validationResult.confidenceScore);
  } else {
    console.log("✗ Invalid complaint input");
  }
}

/**
 * EXAMPLE 3: React Component Integration
 * =======================================
 */

async function handleImageUploadWithOCR(file: File, ocrExtractedText: string) {
  // Step 1: Validate OCR text
  const validation = validateComplaintImageOCR(ocrExtractedText, 0.85);

  if (!validation.isValid) {
    // Show error to user
    return {
      success: false,
      message: "Invalid complaint input",
      reason: validation.validationResult.validationErrors.join("; "),
    };
  }

  // Step 2: Now proceed with analysis using the validated OCR text
  const analysisResult = analyzeImageWithOCR(
    file.name,
    ocrExtractedText,
    true, // hasDescription
    "Road Damage" // descCategory
  );

  if (!analysisResult.isRelevant) {
    return {
      success: false,
      message: analysisResult.warning,
    };
  }

  // Step 3: Success - return classified complaint
  return {
    success: true,
    analysis: analysisResult,
    ocrText: ocrExtractedText,
  };
}

/**
 * EXAMPLE 4: Tesseract.js Integration (when network is available)
 * ===============================================================
 *
 * Install: npm install tesseract.js
 *
 * Then update src/lib/ocrValidation.ts extractOCRTextFromImage function:
 *
 * import Tesseract from 'tesseract.js';
 *
 * export async function extractOCRTextFromImage(imagePath: string | File): Promise<OCRExtractionResult> {
 *   try {
 *     const image = typeof imagePath === 'string' ? imagePath : URL.createObjectURL(imagePath);
 *
 *     const result = await Tesseract.recognize(image, 'eng');
 *
 *     return {
 *       text: result.data.text,
 *       confidence: result.data.confidence / 100,
 *     };
 *   } catch (error) {
 *     console.error('OCR extraction failed:', error);
 *     return {
 *       text: '',
 *       confidence: 0,
 *     };
 *   }
 * }
 */

/**
 * EXAMPLE 5: Full React Handler with Tesseract (Template)
 * ========================================================
 */

// This is a template for your React component
// Uncomment and adapt when tesseract.js is installed

/*
import Tesseract from 'tesseract.js';
import { validateComplaintImageOCR } from '@/lib/ocrValidation';

async function handleImageUploadFull(file: File) {
  if (!file.type.startsWith('image/')) {
    setError('Please upload an image file');
    return;
  }

  setAnalyzing(true);

  try {
    // Step 1: Extract text using OCR
    const imageUrl = URL.createObjectURL(file);
    const ocrResult = await Tesseract.recognize(imageUrl, 'eng');
    const extractedText = ocrResult.data.text;
    const ocrConfidence = ocrResult.data.confidence / 100;

    // Step 2: Validate extracted text
    const validation = validateComplaintImageOCR(extractedText, 0.85);

    if (!validation.isValid) {
      setError('Invalid complaint input');
      setAnalyzing(false);
      return;
    }

    // Step 3: Proceed with complaint analysis
    const analysisResult = analyzeImageWithOCR(
      file.name,
      extractedText,
      true,
      selectedCategory
    );

    if (analysisResult.isRelevant) {
      setImageAnalysis(analysisResult);
      setOcrText(extractedText);
    } else {
      setError(analysisResult.warning || 'Image analysis failed');
    }
  } catch (error) {
    setError('Failed to process image: ' + error?.message);
  } finally {
    setAnalyzing(false);
  }
}
*/

/**
 * VALIDATION RULES EXPLAINED
 * ===========================
 *
 * Text Length Check:
 * - Rejects: "No water" (too short)
 * - Accepts: "There is no water supply in my area for 3 days" (sufficient detail)
 *
 * Content Type Rejection:
 * - Rejects: "Slide 1: PPT on Urban Planning"
 * - Rejects: "ID Card: John Doe, License ABC123"
 * - Rejects: "Class notes: Chapter 5 summary"
 * - Rejects: "Lorem ipsum dolor sit amet"
 *
 * Complaint Signal Detection:
 * - Strong: "broken|damaged|danger|urgent|leak|garbage"
 * - Medium: "problem|issue|complaint|need|repair"
 * - Weak: "bad|poor|dirty"
 *
 * Examples:
 * ✓ "The road has a broken pothole causing vehicle damage" (Strong signals)
 * ✓ "Water pipe issue needs repair urgently" (Medium + Urgent)
 * ✗ "The area has buildings and roads" (No signals)
 * ✗ "Short text" (Too short)
 * ✗ "PPT Slide presentation" (Content type rejected)
 *
 * Confidence Scoring:
 * - Starts at 1.0
 * - Penalties for: short text, generic filler, weak signals
 * - Bonuses for: strong signals, detailed description
 * - Final threshold: >= 0.85 required
 */

/**
 * DEPLOYMENT CHECKLIST
 * ====================
 *
 * Before going to production:
 *
 * 1. [ ] Tests pass: npm test
 * 2. [ ] Install tesseract.js when network is available: npm install tesseract.js
 * 3. [ ] Update extractOCRTextFromImage() in ocrValidation.ts with real tesseract.js code
 * 4. [ ] Update React component to call handleImageUploadFull() with OCR
 * 5. [ ] Set confidence threshold (default 0.85, adjust based on requirements)
 * 6. [ ] Monitor false positives/negatives and tune validation rules
 * 7. [ ] Add logging/analytics to track rejection reasons
 * 8. [ ] Performance test with slow networks (OCR can be slow)
 */

export { exampleSimpleValidation, exampleCompletePipeline, handleImageUploadWithOCR };
