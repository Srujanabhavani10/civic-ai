import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  ArrowRight,
  Search,
  Shield,
  BarChart3,
  Camera,
  Building2,
  Zap,
} from "lucide-react";
import AnimatedCounter from "@/components/AnimatedCounter";
import heroImage from "@/assets/hero-illustration.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const features = [
  { icon: Brain, title: "AI Complaint Analysis", desc: "Natural language processing analyzes complaint text to determine urgency and category automatically." },
  { icon: Zap, title: "Automatic Department Routing", desc: "Complaints are instantly forwarded to the correct government department using AI classification." },
  { icon: Search, title: "Real-Time Complaint Tracking", desc: "Citizens can track their complaint status from submission to resolution in real time." },
  { icon: Camera, title: "Image-Based Issue Detection", desc: "Upload photos of civic issues and AI detects the problem type and severity automatically." },
  { icon: BarChart3, title: "Smart Governance Dashboard", desc: "Comprehensive analytics dashboard for government officials to monitor and manage complaints." },
];

const stats = [
  { value: 12450, label: "Complaints Filed", suffix: "+" },
  { value: 8920, label: "Issues Resolved", suffix: "+" },
  { value: 45, label: "Departments", suffix: "" },
  { value: 94, label: "Satisfaction Rate", suffix: "%" },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="gov-gradient-subtle absolute inset-0" />
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial="hidden"
              animate="visible"
              className="max-w-xl"
            >
              <motion.div
                custom={0}
                variants={fadeUp}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary"
              >
                <Shield className="h-3.5 w-3.5" /> Government of India Initiative
              </motion.div>
              <motion.h1
                custom={1}
                variants={fadeUp}
                className="mb-4 font-heading text-4xl font-extrabold leading-tight text-foreground md:text-5xl lg:text-6xl"
              >
                AI-Based Complaint{" "}
                <span className="text-primary">Grievance System</span>
              </motion.h1>
              <motion.p
                custom={2}
                variants={fadeUp}
                className="mb-8 text-lg text-muted-foreground"
              >
                A smart platform where citizens can report civic issues. Artificial intelligence analyzes complaints and automatically prioritizes and forwards them to the responsible government department.
              </motion.p>
              <motion.div custom={3} variants={fadeUp} className="flex flex-wrap gap-3">
                <Link
                  to="/report"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-heading text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
                >
                  Report a Complaint <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-heading text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
                >
                  Track Your Complaint <Search className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="hidden lg:block"
            >
              <img
                src={heroImage}
                alt="Citizens reporting public issues through AI-powered smart city platform"
                className="rounded-2xl shadow-[var(--shadow-prominent)]"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-12 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <AnimatedCounter end={s.value} suffix={s.suffix} />
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-heading text-3xl font-bold text-foreground">
            Platform Features
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Powered by artificial intelligence to streamline civic complaint management and improve government response time.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="gov-card group p-6"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-heading text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <h2 className="mb-12 text-center font-heading text-3xl font-bold">
            How It Works
          </h2>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: "01", icon: Building2, title: "Submit Complaint", desc: "Fill in details and upload photos of the civic issue." },
              { step: "02", icon: Brain, title: "AI Analyzes", desc: "AI determines priority, category, and the responsible department." },
              { step: "03", icon: Zap, title: "Auto-Routed", desc: "Complaint is automatically forwarded to the correct department." },
              { step: "04", icon: Shield, title: "Resolved", desc: "Track progress until the issue is fully resolved." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="font-heading text-xs font-bold text-primary">STEP {item.step}</span>
                <h3 className="mt-1 font-heading text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
