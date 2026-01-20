import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Users, Calendar, Clock, Moon, TrendingUp, UserCheck, Briefcase, User, Phone, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassButton } from "@/components/ui/glass-button";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { WelcomeMessage } from "@/components/WelcomeMessage";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DetailModal, StatusIndicator } from "@/components/ui/detail-modal";
import { StatusSelect } from "@/components/ui/status-select";
import { useToast } from "@/hooks/use-toast";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type DateRange = "today" | "7days" | "15days" | "30days";
type AppointmentStatus = "pendente" | "confirmado" | "risco" | "cancelado" | "atendido";

const statusLabels: Record<AppointmentStatus, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  risco: "Risco",
  cancelado: "Cancelado",
  atendido: "Atendido",
};

const dateRanges: { label: string; value: DateRange }[] = [
  { label: "Hoje", value: "today" },
  { label: "7 dias", value: "7days" },
  { label: "15 dias", value: "15days" },
  { label: "30 dias", value: "30days" },
];

function getDateRange(range: DateRange) {
  const now = new Date();
  const end = endOfDay(now);
  
  switch (range) {
    case "today":
      return { start: startOfDay(now), end };
    case "7days":
      return { start: startOfDay(subDays(now, 7)), end };
    case "15days":
      return { start: startOfDay(subDays(now, 15)), end };
    case "30days":
      return { start: startOfDay(subDays(now, 30)), end };
    default:
      return { start: startOfDay(subDays(now, 7)), end };
  }
}

function formatMinutesToHours(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

// Import from dateUtils for consistent timezone handling
import { extractTimeFromISO, extractHourFromISO, formatISOToDisplay, extractDateTimeFromISO } from "@/lib/dateUtils";

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("7days");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { start, end } = getDateRange(dateRange);

  // Fetch AI config for opening hours
  const { data: aiConfig } = useQuery({
    queryKey: ["ai-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_configs")
        .select("opening_hours")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const parseOpeningHours = (openingHours: string | null | undefined) => {
    let startHour = 8;
    let endHour = 18;
    if (openingHours) {
      // Match format like "seg a sex das 08:00 as 18:00" or "08:00 - 18:00"
      const timeMatch = openingHours.match(/(\d{1,2}):(\d{2})\s*(?:[-–]|as|às)\s*(\d{1,2}):(\d{2})/i);
      if (timeMatch) {
        startHour = parseInt(timeMatch[1]);
        endHour = parseInt(timeMatch[3]);
      }
    }
    return { startHour, endHour };
  };

  // Fetch leads count
  const { data: leadsData } = useQuery({
    queryKey: ["leads-count", user?.id, dateRange],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch appointments count
  const { data: appointmentsData } = useQuery({
    queryKey: ["appointments-count", user?.id, dateRange],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("scheduled_at", start.toISOString())
        .lte("scheduled_at", end.toISOString());
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch time saved
  const { data: timeSavedData } = useQuery({
    queryKey: ["time-saved", user?.id, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("tempo_economizado")
        .eq("user_id", user!.id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (error) throw error;
      const total = data?.reduce((sum, lead) => sum + (Number(lead.tempo_economizado) || 0), 0) || 0;
      return total;
    },
    enabled: !!user,
  });

  // Fetch after-hours appointments (created outside business hours 08:00-18:00)
  const { data: afterHoursData } = useQuery({
    queryKey: ["after-hours", user?.id, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("created_at")
        .eq("user_id", user!.id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (error) throw error;
      // Fixed business hours: 08:00 - 18:00
      const BUSINESS_START_HOUR = 8;
      const BUSINESS_END_HOUR = 18;
      const afterHours = data?.filter((apt) => {
        // Extract hour directly from ISO string to avoid timezone issues
        const createdHour = extractHourFromISO(apt.created_at);
        return createdHour < BUSINESS_START_HOUR || createdHour >= BUSINESS_END_HOUR;
      }).length || 0;
      return afterHours;
    },
    enabled: !!user,
  });

  // Fetch no-show risk appointments (status = 'risco')
  const { data: noShowRiskData } = useQuery({
    queryKey: ["no-show-risk", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "risco")
        .gte("scheduled_at", startOfDay(new Date()).toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch chart data
  const { data: chartData } = useQuery({
    queryKey: ["chart-data", user?.id, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("scheduled_at")
        .eq("user_id", user!.id)
        .gte("scheduled_at", start.toISOString())
        .lte("scheduled_at", end.toISOString())
        .order("scheduled_at");
      if (error) throw error;
      const grouped: Record<string, number> = {};
      data?.forEach((apt) => {
        const day = extractDateTimeFromISO(apt.scheduled_at).date;
        grouped[day] = (grouped[day] || 0) + 1;
      });
      const days: { date: string; label: string; count: number }[] = [];
      const current = new Date(start);
      while (current <= end) {
        const key = format(current, "yyyy-MM-dd");
        days.push({ date: key, label: format(current, "dd/MM", { locale: ptBR }), count: grouped[key] || 0 });
        current.setDate(current.getDate() + 1);
      }
      return days;
    },
    enabled: !!user,
  });

  // Fetch today's appointments
  const { data: todayAppointments } = useQuery({
    queryKey: ["today-appointments", user?.id],
    queryFn: async () => {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user!.id)
        .gte("scheduled_at", todayStart.toISOString())
        .lte("scheduled_at", todayEnd.toISOString())
        .order("scheduled_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch recent leads
  const { data: recentLeads } = useQuery({
    queryKey: ["recent-leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch extra stats
  const { data: extraStats } = useQuery({
    queryKey: ["extra-stats", user?.id],
    queryFn: async () => {
      const [professionalsRes, servicesRes, clientsRes] = await Promise.all([
        supabase.from("professionals").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_active", true),
        supabase.from("services").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_available", true),
        supabase.from("leads").select("id").eq("user_id", user!.id),
      ]);
      const { data: appointmentsWithLeads } = await supabase
        .from("appointments")
        .select("lead_id")
        .eq("user_id", user!.id);
      const uniqueClients = new Set(appointmentsWithLeads?.map(a => a.lead_id)).size;
      return {
        professionals: professionalsRes.count || 0,
        services: servicesRes.count || 0,
        totalLeads: clientsRes.data?.length || 0,
        uniqueClients,
      };
    },
    enabled: !!user,
  });

  // Update appointment status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["no-show-risk"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const handleAppointmentClick = (apt: any) => {
    setSelectedAppointment(apt);
    setIsAppointmentModalOpen(true);
  };

  return (
    <PageTransition className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
        <div className="space-y-1">
          <WelcomeMessage />
          <FadeIn delay={0.2} direction="up">
            <p className="text-muted-foreground text-sm">Visão geral da sua clínica</p>
          </FadeIn>
        </div>
        <FadeIn delay={0.3} direction="right">
          <div className="flex gap-2 flex-wrap">
            {dateRanges.map((range) => (
              <GlassButton
                key={range.value}
                variant={dateRange === range.value ? "primary" : "default"}
                size="sm"
                onClick={() => setDateRange(range.value)}
              >
                {range.label}
              </GlassButton>
            ))}
          </div>
        </FadeIn>
      </div>

      {/* Grid Layout - Fill Screen */}
      <div className="flex-1 grid grid-cols-12 gap-4 auto-rows-min">
        {/* Row 1: KPIs */}
        <Card className="col-span-6 lg:col-span-3 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsData ?? 0}</div>
            <p className="text-xs text-muted-foreground">novos no período</p>
          </CardContent>
        </Card>

        <Card className="col-span-6 lg:col-span-3 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentsData ?? 0}</div>
            <p className="text-xs text-muted-foreground">no período</p>
          </CardContent>
        </Card>

        <Card className="col-span-6 lg:col-span-3 shadow-card gradient-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-primary-foreground/80 flex items-center gap-2">
              <Clock className="h-4 w-4" />Tempo Economizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutesToHours(timeSavedData ?? 0)}</div>
            <p className="text-xs text-primary-foreground/80">pela IA</p>
          </CardContent>
        </Card>

        <Card className="col-span-6 lg:col-span-3 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />Pós-horário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{afterHoursData ?? 0}</div>
            <p className="text-xs text-muted-foreground">fora do expediente</p>
          </CardContent>
        </Card>

        {/* Row 2: Secondary KPIs */}
        <Card className="col-span-4 lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />Profissionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{extraStats?.professionals ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="col-span-4 lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{extraStats?.services ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="col-span-4 lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {extraStats?.totalLeads ? ((extraStats.uniqueClients / extraStats.totalLeads) * 100).toFixed(0) : 0}%
            </div>
          </CardContent>
        </Card>

        {/* No-Show Risk Card */}
        <Card className="col-span-12 lg:col-span-6 shadow-card border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-orange-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />Risco de No-Show
              <Badge variant="outline" className="ml-auto text-orange-500 border-orange-500/50">
                {noShowRiskData?.length || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {noShowRiskData && noShowRiskData.length > 0 ? (
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {noShowRiskData.slice(0, 3).map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{apt.patientName || "Paciente"}</span>
                      <span className="text-xs text-muted-foreground">{extractTimeFromISO(apt.scheduled_at)}</span>
                    </div>
                    <StatusSelect
                      value={apt.status as AppointmentStatus}
                      onValueChange={(status) => updateStatus.mutate({ id: apt.id, status })}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum risco identificado</p>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="col-span-12 lg:col-span-8 shadow-card row-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evolução de Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData || []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" className="text-xs fill-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis className="text-xs fill-muted-foreground" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorCount)" name="Agendamentos" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="col-span-12 lg:col-span-4 shadow-card row-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Agendamentos de Hoje
              <Badge variant="secondary" className="ml-auto text-xs">{todayAppointments?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {todayAppointments && todayAppointments.length > 0 ? (
              todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  onClick={() => handleAppointmentClick(apt)}
                  className="p-3 rounded-xl border bg-card/50 hover:bg-muted/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-primary">{extractTimeFromISO(apt.scheduled_at)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{apt.patientName || "Paciente"}</p>
                      <p className="text-xs text-muted-foreground truncate">{apt.serviceName}</p>
                    </div>
                    <StatusSelect
                      value={apt.status as AppointmentStatus}
                      onValueChange={(status) => updateStatus.mutate({ id: apt.id, status })}
                      size="sm"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">Nenhum agendamento hoje</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="col-span-12 lg:col-span-6 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Leads Mais Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {recentLeads && recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />{lead.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{format(new Date(lead.created_at), "dd/MM", { locale: ptBR })}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">Nenhum lead</div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Summary */}
        <Card className="col-span-12 lg:col-span-6 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resumo do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{extraStats?.totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{extraStats?.uniqueClients || 0}</div>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{noShowRiskData?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Riscos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Detail Modal */}
      <DetailModal isOpen={isAppointmentModalOpen} onClose={() => setIsAppointmentModalOpen(false)} title="Detalhes do Agendamento">
        {selectedAppointment && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <StatusIndicator status={selectedAppointment.status as AppointmentStatus} size="lg" />
              <span className="font-medium text-lg">{statusLabels[selectedAppointment.status as AppointmentStatus] || "Pendente"}</span>
              <div className="ml-auto">
                <StatusSelect
                  value={selectedAppointment.status as AppointmentStatus}
                  onValueChange={(status) => {
                    updateStatus.mutate({ id: selectedAppointment.id, status });
                    setSelectedAppointment({ ...selectedAppointment, status });
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Paciente</Label><p className="font-medium">{selectedAppointment.patientName || "Não informado"}</p></div>
              <div><Label className="text-muted-foreground text-xs">Lead ID</Label><p className="font-mono text-sm">{selectedAppointment.lead_id?.slice(0, 8)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Telefone</Label><p>{selectedAppointment.phoneNumber || "Não informado"}</p></div>
              <div><Label className="text-muted-foreground text-xs">Serviço</Label><p>{selectedAppointment.serviceName || "Não informado"}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Profissional</Label><p>{selectedAppointment.professionalName || "Não informado"}</p></div>
              <div><Label className="text-muted-foreground text-xs">Data e Hora</Label><p>{formatISOToDisplay(selectedAppointment.scheduled_at)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Duração</Label><p>{selectedAppointment.duracao ? `${Number(selectedAppointment.duracao)} minutos` : "N/A"}</p></div>
              <div><Label className="text-muted-foreground text-xs">Preço</Label><p className="text-lg font-semibold text-primary">R$ {selectedAppointment.price?.toFixed(2) || "0.00"}</p></div>
            </div>
          </div>
        )}
      </DetailModal>
    </PageTransition>
  );
}
