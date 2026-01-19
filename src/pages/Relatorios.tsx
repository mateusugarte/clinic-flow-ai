import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
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
  Clock,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["hsl(0, 84%, 60%)", "hsl(0, 70%, 50%)", "hsl(0, 60%, 45%)", "hsl(0, 50%, 40%)"];

export default function Relatorios() {
  const { user } = useAuth();

  // Fetch appointment stats
  const { data: stats } = useQuery({
    queryKey: ["report-stats", user?.id],
    queryFn: async () => {
      const last30Days = startOfDay(subDays(new Date(), 30));

      // Appointments
      const { data: appointments, error: aptError } = await supabase
        .from("appointments")
        .select("*, services(name, price)")
        .eq("user_id", user!.id)
        .gte("scheduled_at", last30Days.toISOString());

      if (aptError) throw aptError;

      // Leads
      const { data: leads, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", last30Days.toISOString());

      if (leadError) throw leadError;

      // Calculate stats
      const totalRevenue = appointments?.reduce((sum, apt) => sum + (Number(apt.price) || 0), 0) || 0;
      const totalLeads = leads?.length || 0;
      const totalAppointments = appointments?.length || 0;
      
      // Count unique clients (leads) with at least one appointment
      const uniqueLeadsWithAppointments = new Set(appointments?.map(apt => apt.lead_id)).size;
      const conversionRate = totalLeads > 0 ? ((uniqueLeadsWithAppointments / totalLeads) * 100).toFixed(1) : 0;

      // Status distribution
      const statusCounts: Record<string, number> = {};
      appointments?.forEach((apt) => {
        const status = apt.status || "pendente";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statusData = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      // Daily appointments for chart
      const dailyData: Record<string, number> = {};
      appointments?.forEach((apt) => {
        const day = format(new Date(apt.scheduled_at), "dd/MM");
        dailyData[day] = (dailyData[day] || 0) + 1;
      });

      const chartData = Object.entries(dailyData)
        .map(([day, count]) => ({ day, count }))
        .slice(-14);

      return {
        totalRevenue,
        totalLeads,
        totalAppointments,
        conversionRate,
        statusData,
        chartData,
      };
    },
    enabled: !!user,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Análise dos últimos 30 dias</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Novos Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalLeads || 0}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalAppointments || 0}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.conversionRate || 0}%</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Appointments Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Agendamentos por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
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
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Status dos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.statusData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
