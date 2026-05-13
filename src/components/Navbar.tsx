import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Bell, Shield, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { complaintStore } from "@/lib/complaintStore";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(complaintStore.getNotifications());
  const [unreadCount, setUnreadCount] = useState(complaintStore.getUnreadCount());
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const unsub = complaintStore.subscribe(() => {
      setNotifications(complaintStore.getNotifications());
      setUnreadCount(complaintStore.getUnreadCount());
    });
    return unsub;
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
    setOpen(false);
  };

  // Role-based navigation
  const citizenLinks = [
    { path: "/", label: "Home" },
    { path: "/report", label: "Report Complaint" },
    { path: "/track", label: "Track Complaint" },
    { path: "/departments", label: "Departments" },
  ];

  const departmentLinks = [
    { path: "/", label: "Home" },
    { path: "/track", label: "Track Complaint" },
    { path: "/departments", label: "Departments" },
  ];

  const baseLinks = user?.role === "department" ? departmentLinks : citizenLinks;

  const dashboardLink = user
    ? user.role === "citizen"
      ? { path: "/citizen-dashboard", label: "My Dashboard" }
      : { path: "/department-dashboard", label: "Dept Dashboard" }
    : null;

  const navLinks = dashboardLink ? [...baseLinks, dashboardLink] : [...citizenLinks];

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-bold text-foreground">
            AI Complaint System
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === l.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) complaintStore.markAllRead();
                }}
                className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-lg z-50">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-muted-foreground">No notifications yet</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className="border-b border-border/50 px-4 py-3 last:border-0">
                          <p className="text-xs text-foreground">{n.message}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{n.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-foreground">
                <User className="h-3.5 w-3.5" />
                {user.name}
                <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                  {user.role}
                </span>
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                <LogOut className="h-3.5 w-3.5" /> Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:inline-flex"
            >
              Login
            </Link>
          )}

          <button className="rounded-lg p-2 text-muted-foreground md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((l) => (
                <Link
                  key={l.path}
                  to={l.path}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    location.pathname === l.path ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="mt-2 rounded-lg border border-input px-4 py-2.5 text-center text-sm font-medium text-muted-foreground"
                >
                  Logout ({user.name})
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
