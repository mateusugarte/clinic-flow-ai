import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Star,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Clientes() {
  const { user } = useAuth();

  // Fetch clients (leads with at least one appointment)
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      // First get all appointments
      const { data: appointments, error: aptError } = await supabase
        .from("appointments")
        .select("lead_id, service_id, scheduled_at, serviceName")
        .eq("user_id", user!.id);
      
      if (aptError) throw aptError;

      // Get unique lead IDs that have appointments
      const leadIds = [...new Set(appointments?.map((a) => a.lead_id) || [])];
      
      if (leadIds.length === 0) return [];

      // Fetch those leads
      const { data: leads, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id)
        .in("id", leadIds);
      
      if (leadError) throw leadError;

      // Combine with appointment count
      return leads?.map((lead) => ({
        ...lead,
        appointmentCount: appointments?.filter((a) => a.lead_id === lead.id).length || 0,
        lastAppointment: appointments
          ?.filter((a) => a.lead_id === lead.id)
          .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0],
      })) || [];
    },
    enabled: !!user,
  });

  // Calculate stats
  const { data: stats } = useQuery({
    queryKey: ["client-stats", user?.id],
    queryFn: async () => {
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("service_id, serviceName, scheduled_at")
        .eq("user_id", user!.id);
      
      if (error) throw error;

      // Top service
      const serviceCounts: Record<string, { name: string; count: number }> = {};
      appointments?.forEach((apt) => {
        const key = apt.service_id;
        if (!serviceCounts[key]) {
          serviceCounts[key] = { name: apt.serviceName || "Serviço", count: 0 };
        }
        serviceCounts[key].count++;
      });
      const topService = Object.values(serviceCounts).sort((a, b) => b.count - a.count)[0];

      // Top day
      const dayCounts: Record<number, number> = {};
      appointments?.forEach((apt) => {
        const day = new Date(apt.scheduled_at).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const topDay = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0];

      return {
        topService: topService?.name || "N/A",
        topDay: topDay ? days[parseInt(topDay[0])] : "N/A",
        totalClients: clients?.length || 0,
      };
    },
    enabled: !!user && !!clients,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground">Leads que já realizaram agendamentos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Serviço Mais Agendado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.topService || "N/A"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Dia com Mais Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.topDay || "N/A"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{clients?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {clients?.map((client) => (
          <motion.div key={client.id} variants={itemVariants}>
            <Card className="shadow-card hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </p>
                    {client.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {client.appointmentCount} agendamentos
                  </Badge>
                  {client.lastAppointment && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(client.lastAppointment.scheduled_at), "dd/MM/yy", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {clients?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Nenhum cliente encontrado. Clientes aparecerão aqui após realizarem agendamentos.
          </div>
        )}
      </motion.div>
    </div>
  );
}
