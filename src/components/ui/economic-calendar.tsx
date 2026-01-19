import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgendaEvent {
  id: string;
  time: string;
  patientName: string;
  serviceName: string | null;
  professionalName: string | null;
  status: 'pendente' | 'confirmado' | 'risco' | 'cancelado' | 'atendido';
  duration: number | null;
}

interface EconomicCalendarProps {
  title: string;
  events: AgendaEvent[];
  className?: string;
}

const StatusIndicator = ({ status }: { status: AgendaEvent['status'] }) => {
  const colors: Record<AgendaEvent['status'], string> = {
    pendente: "bg-yellow-500",
    confirmado: "bg-green-500",
    risco: "bg-orange-500",
    cancelado: "bg-red-500",
    atendido: "bg-emerald-500",
  };
  
  const labels: Record<AgendaEvent['status'], string> = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    risco: "Risco",
    cancelado: "Cancelado",
    atendido: "Atendido",
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-2 h-2 rounded-full", colors[status])} />
      <span className="text-xs text-muted-foreground">{labels[status]}</span>
    </div>
  );
};

export const EconomicCalendar = React.forwardRef<
  HTMLDivElement,
  EconomicCalendarProps
>(({ title, events, className }, ref) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [events]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 14,
      },
    },
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl border bg-card/80 backdrop-blur-sm p-4 shadow-card",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {events.length} agendamentos
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              aria-label="Rolar para esquerda"
              className="p-1.5 rounded-full bg-background border hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {canScrollRight && events.length > 2 && (
            <button
              onClick={() => scroll("right")}
              aria-label="Rolar para direita"
              className="p-1.5 rounded-full bg-background border hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Events Container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex gap-4"
        >
          {events.length > 0 ? (
            events.map((event) => (
              <motion.div
                key={event.id}
                variants={itemVariants}
                className="min-w-[240px] flex-shrink-0 rounded-xl border bg-background/50 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold text-primary">
                    {event.time}
                  </span>
                  <StatusIndicator status={event.status} />
                </div>
                
                <h4 className="font-semibold text-foreground mb-1 truncate">
                  {event.patientName}
                </h4>
                
                <p className="text-sm text-muted-foreground truncate mb-2">
                  {event.serviceName || "Serviço não definido"}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                  <span>{event.professionalName || "Profissional"}</span>
                  <span>{event.duration || 0} min</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="w-full text-center py-8 text-muted-foreground">
              Nenhum agendamento para hoje
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
});

EconomicCalendar.displayName = "EconomicCalendar";
