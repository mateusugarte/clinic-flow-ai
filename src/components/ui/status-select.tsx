import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type AppointmentStatus = "pendente" | "confirmado" | "risco" | "cancelado" | "atendido";

const statusConfig: Record<AppointmentStatus, { label: string; color: string; bg: string; glow: string }> = {
  pendente: { label: "Pendente", color: "text-yellow-500", bg: "bg-yellow-500/10", glow: "shadow-[0_0_12px_rgba(234,179,8,0.4)]" },
  confirmado: { label: "Confirmado", color: "text-emerald-500", bg: "bg-emerald-500/10", glow: "shadow-[0_0_12px_rgba(16,185,129,0.4)]" },
  risco: { label: "Risco", color: "text-orange-500", bg: "bg-orange-500/10", glow: "shadow-[0_0_12px_rgba(249,115,22,0.4)]" },
  cancelado: { label: "Cancelado", color: "text-red-500", bg: "bg-red-500/10", glow: "shadow-[0_0_12px_rgba(239,68,68,0.4)]" },
  atendido: { label: "Atendido", color: "text-emerald-500", bg: "bg-emerald-500/10", glow: "shadow-[0_0_12px_rgba(16,185,129,0.4)]" },
};

interface StatusSelectProps {
  value: AppointmentStatus;
  onValueChange: (value: AppointmentStatus) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function StatusSelect({ value, onValueChange, disabled = false, size = "md" }: StatusSelectProps) {
  const [isChanging, setIsChanging] = React.useState(false);
  const [prevValue, setPrevValue] = React.useState(value);
  const config = statusConfig[value] || statusConfig.pendente;
  
  const handleChange = (newValue: AppointmentStatus) => {
    if (newValue !== value) {
      setIsChanging(true);
      setPrevValue(value);
      onValueChange(newValue);
      setTimeout(() => setIsChanging(false), 400);
    }
  };
  
  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger 
        className={cn(
          "border-0 font-medium relative overflow-hidden transition-all duration-300",
          config.bg,
          config.color,
          isChanging && config.glow,
          size === "sm" ? "h-7 text-xs px-2 w-28" : "h-9 text-sm px-3 w-36"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={value}
            initial={isChanging ? { opacity: 0, y: 10, scale: 0.9 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ 
              type: "spring",
              stiffness: 500,
              damping: 30,
              mass: 0.8
            }}
            className="flex items-center gap-1.5"
          >
            <motion.div 
              className={cn("w-2 h-2 rounded-full", config.color.replace("text-", "bg-"))}
              initial={isChanging ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 600,
                damping: 20,
                delay: 0.05
              }}
            />
            <SelectValue />
          </motion.div>
        </AnimatePresence>
        
        {/* Ripple effect on change */}
        <AnimatePresence>
          {isChanging && (
            <motion.div
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={cn(
                "absolute inset-0 rounded-full",
                config.color.replace("text-", "bg-").replace("500", "400")
              )}
              style={{ transformOrigin: "center" }}
            />
          )}
        </AnimatePresence>
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <SelectItem key={key} value={key} className={cn("font-medium", cfg.color)}>
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ x: 2 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <motion.div 
                className={cn("w-2 h-2 rounded-full", cfg.color.replace("text-", "bg-"))}
                whileHover={{ scale: 1.2 }}
              />
              {cfg.label}
            </motion.div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}