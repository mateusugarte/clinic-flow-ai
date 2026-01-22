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
             className="fixed inset-0 z-50 modal-backdrop-premium"
            onClick={onClose}
          />
          
          {/* Modal Container */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className={cn(
                "w-full max-w-2xl max-h-[85vh] overflow-hidden",
                "bg-card border border-border rounded-2xl shadow-xl",
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(85vh-64px)] p-6">
                {children}
              </div>
            </motion.div>
          </div>
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
  pendente: { 
    color: "bg-yellow-400", 
    glow: "status-glow-yellow", 
    label: "Pendente",
    ring: "ring-yellow-400/30"
  },
  confirmado: { 
    color: "bg-emerald-400", 
    glow: "status-glow-green", 
    label: "Confirmado",
    ring: "ring-emerald-400/30"
  },
  risco: { 
    color: "bg-orange-500", 
    glow: "status-glow-orange", 
    label: "Risco",
    ring: "ring-orange-500/30"
  },
  cancelado: { 
    color: "bg-red-500", 
    glow: "status-glow-red", 
    label: "Cancelado",
    ring: "ring-red-500/30"
  },
  atendido: { 
    color: "bg-emerald-400", 
    glow: "status-glow-green", 
    label: "Atendido",
    ring: "ring-emerald-400/30"
  },
};

const sizeClasses = {
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

export function StatusIndicator({ status, showLabel = false, size = "md" }: StatusIndicatorProps) {
  const config = statusConfig[status] || statusConfig.pendente;
  
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-full ring-4",
          sizeClasses[size],
          config.color,
          config.glow,
          config.ring
        )}
      />
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}
