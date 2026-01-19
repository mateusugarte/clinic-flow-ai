import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Users, Calendar, Clock, Moon, TrendingUp, UserCheck, Briefcase, User, Phone, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassButton } from "@/components/ui/glass-button";
import { BlurFade } from "@/components/ui/blur-fade";
import { WelcomeMessage } from "@/components/WelcomeMessage";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DetailModal, StatusIndicator } from "@/components/ui/detail-modal";
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

// Format time from ISO date correctly
function formatTimeFromISO(isoString: string): string {
  const date = new Date(isoString);
  return format(date, "HH:mm", { locale: ptBR });
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("7days");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const { user } = useAuth();
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

  // Parse opening hours from config
  const parseOpeningHours = (openingHours: string | null | undefined) => {
    let startHour = 8;
    let endHour = 18;
    
    if (openingHours) {
      const timeMatch = openingHours.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
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

  // Fetch after-hours appointments
  const { data: afterHoursData } = useQuery({
    queryKey: ["after-hours", user?.id, dateRange, aiConfig?.opening_hours],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("scheduled_at")
        .eq("user_id", user!.id)
        .gte("scheduled_at", start.toISOString())
        .lte("scheduled_at", end.toISOString());
      
      if (error) throw error;
      
      const { startHour, endHour } = parseOpeningHours(aiConfig?.opening_hours);
      
      const afterHours = data?.filter((apt) => {
        const scheduledHour = new Date(apt.scheduled_at).getHours();
        return scheduledHour < startHour || scheduledHour >= endHour;
      }).length || 0;
      
      return afterHours;
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
        const day = format(parseISO(apt.scheduled_at), "yyyy-MM-dd");
        grouped[day] = (grouped[day] || 0) + 1;
      });

      const days: { date: string; label: string; count: number }[] = [];
      const current = new Date(start);
      while (current <= end) {
        const key = format(current, "yyyy-MM-dd");
        days.push({
          date: key,
          label: format(current, "dd/MM", { locale: ptBR }),
          count: grouped[key] || 0,
        });
        current.setDate(current.getDate() + 1);
      }
      
      return days;
    },
    enabled: !!user,
  });

  // Fetch today's appointments - FIX: format time correctly from ISO
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

  // Fetch recent leads (by created_at)
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
      
      // Count unique clients with appointments
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const handleAppointmentClick = (apt: any) => {
    setSelectedAppointment(apt);
    setIsAppointmentModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header with Welcome Message */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <WelcomeMessage />
          <BlurFade delay={0.2} duration={0.5}>
            <p className="text-muted-foreground">Visão geral da sua clínica</p>
          </BlurFade>
        </div>
        
        {/* Date Filter */}
        <BlurFade delay={0.3} duration={0.5}>
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
        </BlurFade>
      </div>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Leads Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-card hover:shadow-card-hover transition-all duration-300 aurora-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Leads
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{leadsData ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                novos no período
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Appointments Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-card hover:shadow-card-hover transition-all duration-300 aurora-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Agendamentos
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{appointmentsData ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                no período selecionado
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Time Saved Card - Featured */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-primary hover:shadow-lg transition-all duration-300 gradient-primary text-primary-foreground animate-pulse-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary-foreground/80">
                Tempo Economizado
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatMinutesToHours(timeSavedData ?? 0)}
              </div>
              <p className="text-xs text-primary-foreground/80 mt-1">
                nossa estrutura economizou
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* After Hours Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-card hover:shadow-card-hover transition-all duration-300 aurora-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pós-horário
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Moon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{afterHoursData ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                agendados fora do horário comercial
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Extra Stats Row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 md:grid-cols-3"
      >
        <motion.div variants={itemVariants}>
          <Card className="shadow-card hover:shadow-card-hover transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Profissionais Ativos
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{extraStats?.professionals ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                profissionais cadastrados
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-card hover:shadow-card-hover transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Serviços Disponíveis
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{extraStats?.services ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                serviços ativos
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-card hover:shadow-card-hover transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Conversão
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {extraStats?.totalLeads ? ((extraStats.uniqueClients / extraStats.totalLeads) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                leads que agendaram
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Chart */}
      <BlurFade delay={0.5} duration={0.6}>
        <Card className="shadow-card hover:shadow-card-hover transition-all duration-300">
          <CardHeader>
            <CardTitle>Evolução de Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData || []}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorCount)"
                    name="Agendamentos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Two Column Layout: Today's Appointments + Recent Leads */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Appointments - Clickable */}
        <BlurFade delay={0.6} duration={0.6}>
          <Card className="shadow-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Agendamentos de Hoje
                <Badge variant="secondary" className="ml-auto">
                  {todayAppointments?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {todayAppointments && todayAppointments.length > 0 ? (
                todayAppointments.map((apt) => (
                  <motion.div
                    key={apt.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAppointmentClick(apt)}
                    className="p-4 rounded-xl border bg-card/50 hover:bg-muted/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-primary">
                        {formatTimeFromISO(apt.scheduled_at)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{apt.patientName || "Paciente"}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {apt.serviceName || "Serviço"}
                        </p>
                      </div>
                      <StatusIndicator status={apt.status as AppointmentStatus} size="md" />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{apt.professionalName || "Profissional"}</span>
                      <span>•</span>
                      <span>{apt.duracao || 0} min</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum agendamento para hoje
                </div>
              )}
            </CardContent>
          </Card>
        </BlurFade>

        {/* Recent Leads */}
        <BlurFade delay={0.7} duration={0.6}>
          <Card className="shadow-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Leads Mais Recentes
                <Badge variant="secondary" className="ml-auto">
                  {recentLeads?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {recentLeads && recentLeads.length > 0 ? (
                recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 rounded-xl border bg-card/50 hover:bg-muted/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{lead.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), "dd/MM", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {lead.tags.slice(0, 3).map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lead recente
                </div>
              )}
            </CardContent>
          </Card>
        </BlurFade>
      </div>

      {/* Appointment Detail Modal */}
      <DetailModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        title="Detalhes do Agendamento"
      >
        {selectedAppointment && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <StatusIndicator status={selectedAppointment.status as AppointmentStatus} size="lg" />
              <span className="font-medium text-lg">
                {statusLabels[selectedAppointment.status as AppointmentStatus] || "Pendente"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Paciente</Label>
                <p className="font-medium">{selectedAppointment.patientName || "Não informado"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Lead ID</Label>
                <p className="font-mono text-sm">{selectedAppointment.lead_id?.slice(0, 8)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Telefone</Label>
                <p>{selectedAppointment.phoneNumber || "Não informado"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Serviço</Label>
                <p>{selectedAppointment.serviceName || "Não informado"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Profissional</Label>
                <p>{selectedAppointment.professionalName || "Não informado"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Data e Hora</Label>
                <p>{format(new Date(selectedAppointment.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Duração</Label>
                <p>{selectedAppointment.duracao || 0} minutos</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Preço</Label>
                <p className="text-lg font-semibold text-primary">R$ {selectedAppointment.price?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
            {selectedAppointment.notes && (
              <div>
                <Label className="text-muted-foreground text-xs">Observações</Label>
                <p className="text-sm">{selectedAppointment.notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
