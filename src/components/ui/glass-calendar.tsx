import * as React from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, isToday as isTodayFn, getDate, getDaysInMonth, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Day {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  appointmentsCount: number;
}

interface GlassCalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  appointmentsByDate?: Record<string, number>;
  onNewAppointment?: () => void;
  className?: string;
}

const ScrollbarHide = () => (
  <style>{`
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);

export const GlassCalendar = React.forwardRef<HTMLDivElement, GlassCalendarProps>(
  ({ className, selectedDate: propSelectedDate, onDateSelect, appointmentsByDate = {}, onNewAppointment, ...props }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(propSelectedDate || new Date());
    const [selectedDate, setSelectedDate] = React.useState(propSelectedDate || new Date());

    const monthDays = React.useMemo(() => {
      const start = startOfMonth(currentMonth);
      const totalDays = getDaysInMonth(currentMonth);
      const days: Day[] = [];
      for (let i = 0; i < totalDays; i++) {
        const date = new Date(start.getFullYear(), start.getMonth(), i + 1);
        const dateKey = format(date, "yyyy-MM-dd");
        days.push({
          date,
          isToday: isTodayFn(date),
          isSelected: isSameDay(date, selectedDate),
          appointmentsCount: appointmentsByDate[dateKey] || 0,
        });
      }
      return days;
    }, [currentMonth, selectedDate, appointmentsByDate]);

    const handleDateClick = (date: Date) => {
      setSelectedDate(date);
      onDateSelect?.(date);
    };

    const handlePrevMonth = () => {
      setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
      setCurrentMonth(addMonths(currentMonth, 1));
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-2xl border bg-card/80 backdrop-blur-xl p-5 shadow-card overflow-hidden",
          className
        )}
        {...props}
      >
        <ScrollbarHide />
        
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between mb-4">
          <motion.h2
            key={format(currentMonth, "MMMM yyyy")}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-bold capitalize"
          >
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </motion.h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-background/50 border hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-background/50 border hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Calendar Grid */}
        <div className="relative overflow-x-auto scrollbar-hide pb-2">
          <div className="flex gap-2 min-w-max">
            {monthDays.map((day) => (
              <motion.div
                key={day.date.toISOString()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-xs text-muted-foreground uppercase">
                  {format(day.date, "EEE", { locale: ptBR })}
                </span>
                <button
                  onClick={() => handleDateClick(day.date)}
                  className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-xl text-sm font-semibold transition-all duration-200 relative",
                    {
                      "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30": day.isSelected,
                      "hover:bg-muted/50": !day.isSelected,
                      "ring-2 ring-primary/50": day.isToday && !day.isSelected,
                    }
                  )}
                >
                  {day.isToday && !day.isSelected && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                  )}
                  <span>{getDate(day.date)}</span>
                  {day.appointmentsCount > 0 && (
                    <span className={cn(
                      "text-[10px] leading-tight",
                      day.isSelected ? "text-primary-foreground/80" : "text-primary"
                    )}>
                      {day.appointmentsCount}
                    </span>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />

        {/* Footer Action */}
        {onNewAppointment && (
          <button
            onClick={onNewAppointment}
            className="relative flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </button>
        )}
      </div>
    );
  }
);

GlassCalendar.displayName = "GlassCalendar";
