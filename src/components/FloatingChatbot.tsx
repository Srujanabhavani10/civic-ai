import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, FileText, Search, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { complaintStore } from "@/lib/complaintStore";
import { generateChatbotResponse, type ChatbotContext } from "@/lib/chatbotIntelligence";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  time: string;
  actions?: { label: string; action: string }[];
}

const faqDatabase: Record<string, string> = {
  "how to file": "To file a complaint:\n1. Go to 'Report Complaint'\n2. Fill in your details and location\n3. Select issue category\n4. Describe the problem in detail\n5. Upload a photo if possible\n6. Submit — AI will auto-prioritize!",
  "how to track": "To track your complaint:\n1. Go to 'Track Complaint'\n2. Enter your Complaint ID (e.g., GRV-1045)\n3. View real-time status and timeline",
  "how long": "Typical resolution times:\n• Critical: 24-48 hours\n• High Priority: 3-5 days\n• Medium: 7-10 days\n• Low: 15-20 days",
  "department": "Our departments:\n• Sanitation — garbage, waste\n• Road Maintenance — potholes, road damage\n• Water Board — water supply, leaks\n• Electricity — power, streetlights",
  "status": "Complaint statuses:\n• Submitted — received\n• Assigned — sent to department\n• In Progress — being worked on\n• Resolved — issue fixed",
  "priority": "Priority is determined by AI based on:\n• Keywords in description\n• Issue duration\n• Severity indicators\n• Image analysis\n\nLevels: Critical > High > Medium > Low",
};

function formatTime(date = new Date()): string {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function mapQuickRepliesToActions(replies: string[] | undefined): { label: string; action: string }[] {
  if (!replies?.length) return [];
  return replies.slice(0, 4).map((reply) => {
    const lower = reply.toLowerCase();
    if (lower.includes("report")) return { label: "📝 Report Complaint", action: "/report" };
    if (lower.includes("track")) return { label: "🔍 Track Complaint", action: "/track" };
    if (lower.includes("department")) return { label: "🏢 Departments", action: "/departments" };
    return { label: reply, action: `ask:${reply}` };
  });
}

function getBotResponse(input: string, context: ChatbotContext): Message {
  const lower = input.toLowerCase();
  const id = `msg-${Date.now()}`;

  // Check for complaint tracking
  const grvMatch = input.match(/GRV-\d+/i);
  if (grvMatch) {
    const complaint = complaintStore.getById(grvMatch[0]);
    if (complaint) {
      return {
        id,
        role: "bot",
        text: `📋 **${complaint.id}**\n• Status: **${complaint.status.replace("-", " ")}**\n• Priority: **${complaint.priority.toUpperCase()}**\n• Department: ${complaint.department}\n• Category: ${complaint.category}`,
        time: formatTime(),
        actions: [{ label: "View Full Details", action: `/track?id=${complaint.id}` }],
      };
    }
    return {
      id,
      role: "bot",
      text: `I couldn't find complaint ${grvMatch[0]}. Please check the ID and try again.`,
      time: formatTime(),
      actions: [{ label: "🔍 Track Complaint", action: "/track" }],
    };
  }

  // FAQ quick-path
  for (const [key, answer] of Object.entries(faqDatabase)) {
    if (lower.includes(key)) {
      return { id, role: "bot", text: answer, time: formatTime() };
    }
  }

  // Keyword-based responses
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return {
      id,
      role: "bot",
      text: "Hello! 👋 I'm the AI Civic Assistant. I can help you:\n• File a complaint\n• Track complaint status\n• Find the right department\n• Answer your questions\n\nHow can I help you today?",
      time: formatTime(),
      actions: [
        { label: "📝 File Complaint", action: "/report" },
        { label: "🔍 Track Complaint", action: "/track" },
      ],
    };
  }

  if (lower.includes("thank")) {
    return { id, role: "bot", text: "You're welcome! 😊 Let me know if you need anything else.", time: formatTime() };
  }

  // Intelligent dynamic response with context.
  const dynamic = generateChatbotResponse(input);
  const contextHint =
    context.lastIntent && context.lastIntent === dynamic.intent
      ? "\n\nI can help further if you share the exact location and duration."
      : "";

  return {
    id,
    role: "bot",
    text:
      `${dynamic.message}${dynamic.priorityHint ? `\n• Priority hint: **${dynamic.priorityHint.toUpperCase()}**` : ""}` +
      `${dynamic.suggestedDepartment ? `\n• Suggested department: **${dynamic.suggestedDepartment}**` : ""}` +
      `${dynamic.followUpQuestion ? `\n\n${dynamic.followUpQuestion}` : ""}` +
      contextHint,
    time: formatTime(),
    actions: mapQuickRepliesToActions(dynamic.quickReplies),
  };
}

const FloatingChatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hello! 👋 I'm the AI Civic Assistant. I can help you file complaints, track status, or answer questions about our services.\n\nHow can I help you today?",
      time: formatTime(),
      actions: [
        { label: "📝 File Complaint", action: "/report" },
        { label: "🔍 Track Status", action: "/track" },
        { label: "ℹ️ How it works", action: "faq:how to file" },
      ],
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatContext, setChatContext] = useState<ChatbotContext>({ turns: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: input.trim(), time: formatTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate typing delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
    const botMsg = getBotResponse(userMsg.text, chatContext);
    setMessages((prev) => [...prev, botMsg]);
    setChatContext((prev) => ({ ...prev, turns: (prev.turns || 0) + 1 }));
    setIsTyping(false);
  };

  const handleAction = (action: string) => {
    if (action.startsWith("faq:")) {
      const key = action.replace("faq:", "");
      const answer = faqDatabase[key];
      if (answer) {
        setMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: "user", text: key, time: formatTime() },
          { id: `b-${Date.now()}`, role: "bot", text: answer, time: formatTime() },
        ]);
      }
    } else if (action.startsWith("ask:")) {
      const prompt = action.replace("ask:", "");
      setInput(prompt);
    } else {
      navigate(action);
      setOpen(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-96 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-prominent)]"
          >
            <div className="gov-gradient px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary-foreground" />
                <div>
                  <h3 className="font-heading text-sm font-semibold text-primary-foreground">AI Civic Assistant</h3>
                  <p className="text-[10px] text-primary-foreground/70">File complaints • Track status • Get help</p>
                </div>
                <span className="ml-auto h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              </div>
            </div>

            <div className="flex h-80 flex-col gap-3 overflow-y-auto p-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${msg.role === "bot" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {msg.role === "bot" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`max-w-[75%] ${msg.role === "user" ? "text-right" : ""}`}>
                    <div className={`rounded-lg px-3 py-2 text-sm whitespace-pre-line ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"}`}>
                      {msg.text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                      )}
                    </div>
                    <div className={`mt-0.5 text-[10px] text-muted-foreground ${msg.role === "user" ? "text-right" : ""}`}>
                      {msg.time}
                    </div>
                    {msg.actions && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {msg.actions.map((a) => (
                          <button
                            key={a.label}
                            onClick={() => handleAction(a.action)}
                            className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="rounded-lg rounded-tl-none bg-muted px-3 py-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2 border-t border-border p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Describe your issue or ask a question..."
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={handleSend} disabled={!input.trim()} className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>
    </div>
  );
};

export default FloatingChatbot;
