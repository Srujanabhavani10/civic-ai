import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loginUser } from "@/lib/api";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, token } = await loginUser(email, password);
      login(user, token);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === "citizen" ? "/citizen-dashboard" : "/department-dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-57px-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <LogIn className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Sign In</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Access your complaint management account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="gov-card space-y-4 p-6">
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
            <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Demo Accounts:</p>
            <p><strong>Citizen:</strong> citizen@example.com</p>
            <p><strong>Sanitation Dept:</strong> sanitation@gov.in</p>
            <p><strong>Roads Dept:</strong> roads@gov.in</p>
            <p className="mt-1 italic">Use any password</p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
