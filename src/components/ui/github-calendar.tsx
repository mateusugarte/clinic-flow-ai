"use client";

import { useState, useEffect } from "react";
import { format, subDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContributionDay {
  date: string;
  count: number;
}

interface GitHubCalendarProps {
  data: ContributionDay[];
  colors?: string[];
}

const GitHubCalendar = ({ 
  data, 
  colors = [
    "hsl(var(--muted))", 
    "hsl(var(--primary) / 0.3)", 
    "hsl(var(--primary) / 0.5)", 
    "hsl(var(--primary) / 0.7)", 
    "hsl(var(--primary))"
  ] 
}: GitHubCalendarProps) => {
  const [contributions, setContributions] = useState<{ date: Date; count: number }[]>([]);
  const today = new Date();
  const startDate = subDays(today, 364);
  const weeks = 53;

  useEffect(() => {
    setContributions(data.map((item) => ({ ...item, date: new Date(item.date) })));
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return colors[0];
    if (count === 1) return colors[1];
    if (count === 2) return colors[2];
    if (count === 3) return colors[3];
    return colors[4] || colors[colors.length - 1];
  };

  const renderWeeks = () => {
    const weeksArray = [];
    let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 0 });

    for (let i = 0; i < weeks; i++) {
      const weekDays = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
      });

      weeksArray.push(
        <div key={i} className="flex flex-col gap-[3px]">
          {weekDays.map((day, index) => {
            const contribution = contributions.find((c) => isSameDay(new Date(c.date), day));
            const color = contribution ? getColor(contribution.count) : colors[0];
            const count = contribution?.count || 0;

            return (
              <div
                key={index}
                className="w-[10px] h-[10px] rounded-sm cursor-pointer transition-transform hover:scale-125"
                style={{ backgroundColor: color }}
                title={`${format(day, "dd/MM/yyyy", { locale: ptBR })}: ${count} agendamento${count !== 1 ? 's' : ''}`}
              />
            );
          })}
        </div>
      );
      currentWeekStart = addDays(currentWeekStart, 7);
    }

    return weeksArray;
  };

  const renderMonthLabels = () => {
    const months = [];
    let currentMonth = startDate;
    for (let i = 0; i < 12; i++) {
      months.push(
        <span
          key={i}
          className="text-xs text-muted-foreground"
          style={{ gridColumn: `${Math.floor(i * 4.4) + 2} / span 4` }}
        >
          {format(currentMonth, "MMM", { locale: ptBR })}
        </span>
      );
      currentMonth = addDays(currentMonth, 30);
    }
    return months;
  };

  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-max">
        <div className="flex gap-2">
          <div className="flex flex-col gap-[3px] pr-2">
            {dayLabels.map((day, index) => (
              <span
                key={index}
                className="text-[10px] text-muted-foreground h-[10px] leading-[10px]"
              >
                {index % 2 === 0 ? day : ""}
              </span>
            ))}
          </div>
          <div>
            <div className="grid grid-cols-[repeat(53,_10px)] gap-x-[3px] mb-1">
              {renderMonthLabels()}
            </div>
            <div className="flex gap-[3px]">
              {renderWeeks()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-xs text-muted-foreground">Menos</span>
          {colors.map((color, index) => (
            <div
              key={index}
              className="w-[10px] h-[10px] rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-xs text-muted-foreground">Mais</span>
        </div>
      </div>
    </div>
  );
};

export { GitHubCalendar };
