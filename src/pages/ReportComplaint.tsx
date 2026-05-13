import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Brain,
  Camera,
  XCircle,
  Loader2,
  Zap,
  ShieldAlert,
  TrendingUp,
  Clock,
} from "lucide-react";
import { complaintCategories, type Complaint, type ComplaintCategory } from "@/lib/mockData";
import { analyzeComplaint, analyzeComplaintRealtime, analyzeImage, type AIAnalysisResult, type ImageAnalysisResult } from "@/lib/aiAnalysis";
import { validateCivicComplaintText } from "@/lib/textValidation";
import { complaintStore } from "@/lib/complaintStore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";

const priorityConfig = {
  critical: { label: "CRITICAL", className: "priority-critical", icon: ShieldAlert, color: "text-destructive" },
  high: { label: "HIGH", className: "priority-high", icon: AlertCircle, color: "text-destructive" },
  medium: { label: "MEDIUM", className: "priority-medium", icon: AlertTriangle, color: "text-[hsl(var(--warning))]" },
  low: { label: "LOW", className: "priority-low", icon: CheckCircle2, color: "text-[hsl(var(--success))]" },
};

const ReportComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [realtimePreview, setRealtimePreview] = useState<Partial<AIAnalysisResult> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [complaintId, setComplaintId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [formError, setFormError] = useState("");

  const [name, setName] = useState(user?.name || "");
  const [mobile, setMobile] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Real-time description analysis
  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    setFormError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const preview = analyzeComplaintRealtime(value);
      setRealtimePreview(preview);
    }, 500);
  }, []);

  // Block department users
  if (user?.role === "department") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
        <h1 className="font-heading text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          Department authorities cannot file complaints. Please use your Department Dashboard.
        </p>
        <button onClick={() => navigate("/department-dashboard")} className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          Go to Department Dashboard
        </button>
      </div>
    );
  }

  // Image analysis
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFileName(file.name);
    setAnalyzingImage(true);
    setImageAnalysis(null);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    await new Promise((r) => setTimeout(r, 1800));
    const result = analyzeImage(file.name, description.length > 10, category || undefined);
    setImageAnalysis(result);
    setAnalyzingImage(false);
    if (!result.isRelevant) {
      setFormError(result.warning || "This image may not clearly show a complaint. Please upload a clearer image.");
    } else {
      setFormError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!category) { setFormError("Please select an issue category."); return; }
    if (imageAnalysis && !imageAnalysis.isRelevant) { setFormError(imageAnalysis.warning || "Please upload a relevant image."); return; }

    const civicText = validateCivicComplaintText(description);
    if (!civicText.valid) {
      setFormError(civicText.reason || "Please enter a valid civic issue description.");
      return;
    }

    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 800));
    const result = analyzeComplaint(description, category as ComplaintCategory, !!imagePreview, imageFileName);
    if (!result.isRelevant) { setAiResult(result); setFormError(result.rejectionReason || "Invalid complaint."); setAnalyzing(false); return; }
    await new Promise((r) => setTimeout(r, 700));

    const id = "GRV-" + Math.floor(Math.random() * 9000 + 1000);
    const now = new Date().toISOString();
    const complaint: Complaint = {
      id, name, mobile, email: email || undefined, city, area, landmark,
      category: result.category as ComplaintCategory, description,
      imageUrl: imagePreview || undefined, status: "received", priority: result.priority,
      department: result.department, confidence: result.confidence,
      detectedIssue: result.detectedIssue, imageConfidence: result.imageConfidence,
      createdAt: now, statusHistory: [{ status: "received", timestamp: now }],
    };
    complaintStore.add(complaint);
    setComplaintId(id);
    setAiResult(result);
    setSubmitted(true);
    setAnalyzing(false);
    toast.success("Complaint submitted successfully! ID: " + id);
  };

  const config = aiResult && aiResult.isRelevant ? priorityConfig[aiResult.priority] : null;
  const previewConfig = realtimePreview?.priority ? priorityConfig[realtimePreview.priority] : null;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-bold text-foreground">Report a Complaint</h1>
        <p className="mt-2 text-muted-foreground">Submit your civic complaint and let AI prioritize it automatically.</p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-5">
        {!submitted ? (
          <form onSubmit={handleSubmit} className="gov-card space-y-5 p-6 lg:col-span-3">
            <h2 className="font-heading text-lg font-semibold">Citizen Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField label="Full Name" required placeholder="Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} />
              <InputField label="Mobile Number" required placeholder="9876543210" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <InputField label="Email (optional)" placeholder="email@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

            <h2 className="pt-2 font-heading text-lg font-semibold">Location</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <InputField label="City" required placeholder="Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
              <InputField label="Area" required placeholder="Andheri West" value={area} onChange={(e) => setArea(e.target.value)} />
              <InputField label="Street / Landmark" placeholder="Near Station Road" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </div>

            <h2 className="pt-2 font-heading text-lg font-semibold">Issue Details</h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Issue Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)} required className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select category...</option>
                {complaintCategories.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
              <textarea required rows={4} value={description} onChange={(e) => handleDescriptionChange(e.target.value)} placeholder="Describe the issue in detail. Include severity, duration, and specific location..." className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <p className="mt-1 text-xs text-muted-foreground">Be specific: mention location, severity, how long the issue has existed. Min 5 words.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Upload Evidence</label>
              <div onClick={() => fileRef.current?.click()} className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/30 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
                {analyzingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-primary">AI is analyzing your image...</p>
                    <p className="text-xs text-muted-foreground">Detecting civic issues using computer vision</p>
                  </div>
                ) : imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-32 w-auto rounded-lg object-cover" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload image of the issue</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG supported • AI will analyze automatically</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>

            {imageAnalysis && !analyzingImage && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-lg border p-4 ${imageAnalysis.isRelevant ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Camera className={`h-4 w-4 ${imageAnalysis.isRelevant ? "text-primary" : "text-destructive"}`} />
                  <span className="text-sm font-semibold">{imageAnalysis.isRelevant ? "Image Analysis Complete" : "Image Issue Detected"}</span>
                </div>
                {imageAnalysis.isRelevant ? (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Detected:</span> <span className="font-medium text-foreground">{imageAnalysis.detectedIssue}</span></div>
                    <div><span className="text-muted-foreground">Confidence:</span> <span className="font-medium text-primary">{imageAnalysis.confidence}%</span></div>
                    <div><span className="text-muted-foreground">Dept:</span> <span className="font-medium text-foreground">{imageAnalysis.department}</span></div>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">{imageAnalysis.warning}</p>
                )}
              </motion.div>
            )}

            {formError && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-destructive">AI Analysis Warning</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formError}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <button type="submit" disabled={analyzing} className="w-full rounded-xl bg-primary py-3 font-heading text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
              {analyzing ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> AI Analyzing Your Complaint...</span>
              ) : "Submit Complaint"}
            </button>
          </form>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="gov-card flex flex-col items-center justify-center p-8 text-center lg:col-span-3">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
              <CheckCircle2 className="mb-4 h-16 w-16 text-[hsl(var(--success))]" />
            </motion.div>
            <h2 className="font-heading text-xl font-bold text-foreground">Complaint Submitted Successfully!</h2>
            <p className="mt-2 text-muted-foreground">Your complaint has been registered and analyzed by our AI system.</p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-6 py-3">
              <p className="text-xs text-muted-foreground">Your Complaint ID</p>
              <p className="font-heading text-2xl font-bold text-primary">{complaintId}</p>
            </motion.div>
            <p className="mt-3 text-xs text-muted-foreground">Save this ID to track your complaint status.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => navigate(`/track?id=${complaintId}`)} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Track Complaint</button>
              <button onClick={() => { setSubmitted(false); setAiResult(null); setRealtimePreview(null); setDescription(""); setCategory(""); setImagePreview(null); setImageAnalysis(null); setFormError(""); }} className="rounded-lg border border-input px-5 py-2.5 text-sm font-medium text-muted-foreground">File Another</button>
            </div>
          </motion.div>
        )}

        {/* AI Results Sidebar */}
        <div className="space-y-5 lg:col-span-2">
          <AnimatePresence mode="wait">
            {!submitted && realtimePreview && previewConfig && (
              <motion.div key="realtime" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="gov-card overflow-hidden">
                <div className="flex items-center gap-2 bg-primary/5 px-5 py-3 border-b border-border/50">
                  <Zap className="h-4 w-4 text-primary" />
                  <h3 className="font-heading text-xs font-semibold text-primary">Live AI Analysis</h3>
                  <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--success))]" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Predicted Priority</span>
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${previewConfig.className}`}>
                      <previewConfig.icon className="h-3 w-3" />{previewConfig.label}
                    </span>
                  </div>
                  <div><span className="text-xs text-muted-foreground">Detected Category</span><p className="text-sm font-semibold text-foreground">{realtimePreview.category}</p></div>
                  <div><span className="text-xs text-muted-foreground">Suggested Department</span><p className="text-sm font-semibold text-foreground">{realtimePreview.department}</p></div>
                  {realtimePreview.confidence && (
                    <div>
                      <span className="text-xs text-muted-foreground">Confidence</span>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><motion.div initial={{ width: 0 }} animate={{ width: `${realtimePreview.confidence}%` }} className="h-full rounded-full bg-primary" /></div>
                        <span className="text-xs font-bold text-primary">{realtimePreview.confidence}%</span>
                      </div>
                    </div>
                  )}
                  {realtimePreview.keywords && realtimePreview.keywords.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Detected Keywords</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {realtimePreview.keywords.map((kw, i) => (<span key={i} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{kw}</span>))}
                      </div>
                    </div>
                  )}
                  {realtimePreview.durationDetected && (
                    <div className="flex items-center gap-1.5 rounded-md bg-warning/10 px-3 py-2 text-xs">
                      <Clock className="h-3 w-3 text-[hsl(var(--warning))]" />
                      <span className="text-[hsl(var(--warning))] font-medium">Duration detected: {realtimePreview.durationDetected}</span>
                    </div>
                  )}
                  {realtimePreview.severityFactors && realtimePreview.severityFactors.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Severity Factors</span>
                      {realtimePreview.severityFactors.map((f, i) => (
                        <div key={i} className="mt-1 flex items-center gap-1.5 text-xs"><TrendingUp className="h-3 w-3 text-destructive" /><span className="text-foreground">{f}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {analyzing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gov-card p-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <Brain className="h-12 w-12 text-primary" />
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary" />
                </div>
                <p className="font-heading text-sm font-semibold text-foreground">AI Processing Your Complaint</p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0 }}>✓ Analyzing text with NLP engine...</motion.p>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>✓ Determining priority level...</motion.p>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>✓ Routing to department...</motion.p>
                </div>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {submitted && aiResult && config && (
              <>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="gov-card overflow-hidden">
                  <div className="gov-gradient flex items-center gap-2 px-5 py-3">
                    <Brain className="h-5 w-5 text-primary-foreground" />
                    <h3 className="font-heading text-sm font-semibold text-primary-foreground">AI Analysis Result</h3>
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <span className="text-xs text-muted-foreground">Priority Level</span>
                      <div className={`mt-1 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold ${config.className}`}><config.icon className="h-4 w-4" />{config.label}</div>
                    </div>
                    <div><span className="text-xs text-muted-foreground">Detected Category</span><p className="mt-0.5 font-heading text-sm font-semibold text-foreground">{aiResult.category}</p></div>
                    <div><span className="text-xs text-muted-foreground">Assigned Department</span><p className="mt-0.5 font-heading text-sm font-semibold text-foreground">{aiResult.department}</p></div>
                    <div>
                      <span className="text-xs text-muted-foreground">Confidence Score</span>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"><motion.div initial={{ width: 0 }} animate={{ width: `${aiResult.confidence}%` }} transition={{ duration: 1, delay: 0.3 }} className="h-full rounded-full bg-primary" /></div>
                        <span className="font-heading text-sm font-bold text-primary">{aiResult.confidence}%</span>
                      </div>
                    </div>
                    {aiResult.keywords.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Matched Keywords</span>
                        <div className="mt-1 flex flex-wrap gap-1">{aiResult.keywords.map((kw, i) => (<span key={i} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{kw}</span>))}</div>
                      </div>
                    )}
                    {aiResult.severityFactors.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Severity Factors</span>
                        {aiResult.severityFactors.map((f, i) => (<p key={i} className="mt-0.5 text-xs text-foreground">• {f}</p>))}
                      </div>
                    )}
                  </div>
                </motion.div>
                {aiResult.detectedIssue && imagePreview && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="gov-card overflow-hidden">
                    <div className="flex items-center gap-2 bg-info/10 px-5 py-3"><Camera className="h-5 w-5 text-info" /><h3 className="font-heading text-sm font-semibold text-info">AI Image Detection</h3></div>
                    <div className="p-5">
                      <img src={imagePreview} alt="Detected issue" className="mb-4 w-full rounded-lg object-cover" />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Detected Issue</span><span className="font-semibold text-foreground">{aiResult.detectedIssue}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Confidence</span><span className="font-semibold text-primary">{aiResult.imageConfidence}%</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Department</span><span className="font-semibold text-foreground">{aiResult.department}</span></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>

          {!submitted && !realtimePreview && !analyzing && (
            <div className="gov-card p-6 text-center">
              <Brain className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">AI Analysis Preview</p>
              <p className="mt-1 text-xs text-muted-foreground">Start typing your complaint description to see real-time AI analysis.</p>
              <div className="mt-4 text-left text-xs text-muted-foreground space-y-1.5">
                <p className="font-medium text-foreground">How it works:</p>
                <p>• NLP extracts category, priority & department</p>
                <p>• Duration keywords boost priority (e.g., "5 days")</p>
                <p>• Severity words trigger higher priority</p>
                <p>• Image analysis detects issue type</p>
                <p>• Irrelevant content is auto-rejected</p>
              </div>
            </div>
          )}

          {!submitted && aiResult && !aiResult.isRelevant && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="gov-card overflow-hidden">
              <div className="flex items-center gap-2 bg-destructive/10 px-5 py-3"><XCircle className="h-5 w-5 text-destructive" /><h3 className="font-heading text-sm font-semibold text-destructive">AI Rejection</h3></div>
              <div className="p-5"><p className="text-sm text-muted-foreground">{aiResult.rejectionReason}</p><p className="mt-3 text-xs text-muted-foreground">Update your description with relevant civic issue details and try again.</p></div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const InputField = ({ label, required, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-foreground">{label}{required && <span className="text-destructive"> *</span>}</label>
    <input required={required} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" {...props} />
  </div>
);

export default ReportComplaint;
