import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitHubCalendar } from "@/components/ui/github-calendar";
import { format, subDays, startOfDay, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getScheduledDateKey, formatDateKeyBR } from "@/lib/scheduledAt";

const COLORS = ["hsl(var(--primary))", "hsl(var(--primary) / 0.7)", "hsl(var(--primary) / 0.5)", "hsl(var(--primary) / 0.3)"];

export default function Relatorios() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["report-stats", user?.id],
    queryFn: async () => {
      const last30Days = startOfDay(subDays(new Date(), 30));
      const { data: appointments, error: aptError } = await supabase
        .from("appointments")
        .select("*, services(name, price)")
        .eq("user_id", user!.id)
        .gte("scheduled_at", last30Days.toISOString());
      if (aptError) throw aptError;

      const { data: leads, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", last30Days.toISOString());
      if (leadError) throw leadError;

      const totalRevenue = appointments?.reduce((sum, apt) => sum + (Number(apt.price) || 0), 0) || 0;
      const totalLeads = leads?.length || 0;
      const totalAppointments = appointments?.length || 0;
      const uniqueLeadsWithAppointments = new Set(appointments?.map(apt => apt.lead_id)).size;
      const conversionRate = totalLeads > 0 ? ((uniqueLeadsWithAppointments / totalLeads) * 100).toFixed(1) : 0;

      const statusCounts: Record<string, number> = {};
      appointments?.forEach((apt) => {
        const status = apt.status || "pendente";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const statusLabels: Record<string, string> = {
        pendente: "Pendente", confirmado: "Confirmado", risco: "Risco", cancelado: "Cancelado", atendido: "Atendido",
      };
      const statusData = Object.entries(statusCounts).map(([name, value]) => ({
        name: statusLabels[name] || name, value,
      }));

      const dailyData: Record<string, number> = {};
      appointments?.forEach((apt) => {
        const day = formatDateKeyBR(getScheduledDateKey(apt.scheduled_at));
        dailyData[day] = (dailyData[day] || 0) + 1;
      });
      const chartData = Object.entries(dailyData).map(([day, count]) => ({ day, count })).slice(-14);

      return { totalRevenue, totalLeads, totalAppointments, conversionRate, statusData, chartData };
    },
    enabled: !!user,
  });

  const { data: yearlyAppointments } = useQuery({
    queryKey: ["yearly-appointments", user?.id],
    queryFn: async () => {
      // Get all appointments for the current year
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
      const { data, error } = await supabase
        .from("appointments")
        .select("scheduled_at")
        .eq("user_id", user!.id)
        .gte("scheduled_at", startOfYear.toISOString())
        .lte("scheduled_at", endOfYear.toISOString());
      if (error) throw error;
      const groupedByDate: Record<string, number> = {};
      data?.forEach((apt) => {
        const dateKey = getScheduledDateKey(apt.scheduled_at);
        groupedByDate[dateKey] = (groupedByDate[dateKey] || 0) + 1;
      });
      return Object.entries(groupedByDate).map(([date, count]) => ({ date, count }));
    },
    enabled: !!user,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análise dos últimos 30 dias</p>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 auto-rows-min">
        {/* Stats Cards Row */}
        <Card className="col-span-6 lg:col-span-3 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</p>
          </CardContent>
        </Card>

        <Card className="col-span-6 lg:col-span-3 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />Novos Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{stats?.totalLeads || 0}</p>
          </CardContent>
        </Card>

        <Card className="col-span-6 lg:col-span-3 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{stats?.totalAppointments || 0}</p>
          </CardContent>
        </Card>

        <Card className="col-span-6 lg:col-span-3 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{stats?.conversionRate || 0}%</p>
          </CardContent>
        </Card>

        {/* Yearly Calendar */}
        <Card className="col-span-12 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Calendário Anual de Agendamentos</CardTitle>
            <p className="text-xs text-muted-foreground">Visualização dos agendamentos no último ano</p>
          </CardHeader>
          <CardContent>
            <GitHubCalendar data={yearlyAppointments || []} />
          </CardContent>
        </Card>

        {/* Charts Row */}
        <Card className="col-span-12 lg:col-span-7 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Agendamentos por Dia</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Agendamentos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-5 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status dos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.statusData || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats?.statusData?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
