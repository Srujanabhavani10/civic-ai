import { motion } from "framer-motion";
import { Building2, Droplets, Truck, Zap, TrafficCone } from "lucide-react";
import { departmentPerformance } from "@/lib/mockData";

const icons = [Building2, Truck, Droplets, Zap, TrafficCone];

const Departments = () => (
  <div className="container mx-auto px-4 py-10">
    <div className="mb-10 text-center">
      <h1 className="font-heading text-3xl font-bold text-foreground">Government Departments</h1>
      <p className="mt-2 text-muted-foreground">Department-wise performance and complaint resolution rates.</p>
    </div>

    <div className="mx-auto grid max-w-4xl gap-6">
      {departmentPerformance.map((dept, i) => {
        const Icon = icons[i % icons.length];
        return (
          <motion.div
            key={dept.name}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="gov-card flex items-center gap-5 p-5"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-heading text-sm font-semibold text-foreground">{dept.name}</h3>
                <span className="font-heading text-sm font-bold text-primary">{dept.resolution}%</span>
              </div>
              <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${dept.resolution}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Total: {dept.total}</span>
                <span>Resolved: {dept.resolved}</span>
                <span>Pending: {dept.total - dept.resolved}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
);

export default Departments;
