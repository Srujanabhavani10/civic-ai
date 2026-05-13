import { Brain, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold">AI Complaint System</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Smart Governance Through AI-Powered Public Issue Management
          </p>
        </div>

        <div>
          <h4 className="mb-3 font-heading text-sm font-semibold">Quick Links</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <Link to="/report" className="hover:text-primary">Report Complaint</Link>
            <Link to="/track" className="hover:text-primary">Track Complaint</Link>
            <Link to="/departments" className="hover:text-primary">Departments</Link>
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-heading text-sm font-semibold">Departments</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span>Sanitation Department</span>
            <span>Water Board</span>
            <span>Road Maintenance</span>
            <span>Electricity Department</span>
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-heading text-sm font-semibold">Contact</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> 1800-100-1234</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> complaints@gov.in</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> City Municipal Office</div>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        © 2026 AI-Based Complaint Grievance System. All rights reserved. | Government of India Initiative
      </div>
    </div>
  </footer>
);

export default Footer;
