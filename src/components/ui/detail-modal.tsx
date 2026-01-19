import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function DetailModal({ isOpen, onClose, title, children, className }: DetailModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-50 inset-0 m-auto",
              "w-[95vw] max-w-2xl h-fit max-h-[85vh] overflow-hidden",
              "bg-card border border-border rounded-2xl shadow-2xl",
              className
            )}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Status indicator with glow effect
interface StatusIndicatorProps {
  status: "pendente" | "confirmado" | "risco" | "cancelado" | "atendido";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig = {
  pendente: { color: "bg-yellow-500", glow: "shadow-[0_0_12px_rgba(234,179,8,0.6)]", label: "Pendente" },
  confirmado: { color: "bg-emerald-400", glow: "shadow-[0_0_12px_rgba(52,211,153,0.6)]", label: "Confirmado" },
  risco: { color: "bg-orange-500", glow: "shadow-[0_0_12px_rgba(249,115,22,0.6)]", label: "Risco" },
  cancelado: { color: "bg-red-500", glow: "shadow-[0_0_12px_rgba(239,68,68,0.6)]", label: "Cancelado" },
  atendido: { color: "bg-emerald-400", glow: "shadow-[0_0_12px_rgba(52,211,153,0.6)]", label: "Atendido" },
};

const sizeClasses = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function StatusIndicator({ status, showLabel = false, size = "md" }: StatusIndicatorProps) {
  const config = statusConfig[status] || statusConfig.pendente;
  
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-full animate-pulse",
          sizeClasses[size],
          config.color,
          config.glow
        )}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}
