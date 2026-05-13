import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { registerUser } from "@/lib/api";
import { toast } from "sonner";

const departments = [
  "Sanitation Department",
  "Road Maintenance",
  "Water Board",
  "Electricity Department",
];

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "department">("citizen");
  const [department, setDepartment] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "department" && !department) {
      toast.error("Please select a department");
      return;
    }
    setLoading(true);
    try {
      const { user, token } = await registerUser({
        name,
        email,
        password,
        role,
        phone,
        department: role === "department" ? department : undefined,
      });
      login(user, token);
      toast.success("Registration successful!");
      navigate(user.role === "citizen" ? "/citizen-dashboard" : "/department-dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-57px-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Create Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register as a citizen or department authority
          </p>
        </div>

        <form onSubmit={handleSubmit} className="gov-card space-y-4 p-6">
          {/* Role Toggle */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Account Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["citizen", "department"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    role === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {r === "citizen" ? "Citizen" : "Department Authority"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {role === "department" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
