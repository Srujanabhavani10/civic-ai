import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingChatbot from "@/components/FloatingChatbot";
import Index from "./pages/Index";
import ReportComplaint from "./pages/ReportComplaint";
import TrackComplaint from "./pages/TrackComplaint";
import Departments from "./pages/Departments";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CitizenDashboard from "./pages/CitizenDashboard";
import DepartmentDashboard from "./pages/DepartmentDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: "citizen" | "department" }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === "citizen" ? "/citizen-dashboard" : "/department-dashboard"} replace />;
  }
  return <>{children}</>;
}

const AppRoutes = () => (
  <>
    <Navbar />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/report" element={<ReportComplaint />} />
      <Route path="/track" element={<TrackComplaint />} />
      <Route path="/departments" element={<Departments />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/citizen-dashboard"
        element={
          <ProtectedRoute allowedRole="citizen">
            <CitizenDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/department-dashboard"
        element={
          <ProtectedRoute allowedRole="department">
            <DepartmentDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <Footer />
    <FloatingChatbot />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
