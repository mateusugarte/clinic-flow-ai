import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type AppointmentStatus = "pendente" | "confirmado" | "risco" | "cancelado" | "atendido";

const statusConfig: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  pendente: { label: "Pendente", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  confirmado: { label: "Confirmado", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  risco: { label: "Risco", color: "text-orange-500", bg: "bg-orange-500/10" },
  cancelado: { label: "Cancelado", color: "text-red-500", bg: "bg-red-500/10" },
  atendido: { label: "Atendido", color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

interface StatusSelectProps {
  value: AppointmentStatus;
  onValueChange: (value: AppointmentStatus) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function StatusSelect({ value, onValueChange, disabled = false, size = "md" }: StatusSelectProps) {
  const config = statusConfig[value] || statusConfig.pendente;
  
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger 
        className={cn(
          "border-0 font-medium",
          config.bg,
          config.color,
          size === "sm" ? "h-7 text-xs px-2 w-28" : "h-9 text-sm px-3 w-36"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <SelectItem key={key} value={key} className={cn("font-medium", cfg.color)}>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", cfg.color.replace("text-", "bg-"))} />
              {cfg.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
