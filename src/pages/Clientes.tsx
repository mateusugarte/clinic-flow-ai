import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { User, Phone, Mail, Calendar as CalendarIcon, TrendingUp, Star, Clock, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DetailModal, StatusIndicator } from "@/components/ui/detail-modal";
import { StatusSelect } from "@/components/ui/status-select";
import { PageTransition, FadeIn } from "@/components/ui/page-transition";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatISOToDisplay, extractTimeFromISO } from "@/lib/dateUtils";
import { compareScheduledAt, dateKeyToLocalDate, formatDateKeyBR, getScheduledDateKey } from "@/lib/scheduledAt";

type DateFilter = "7days" | "15days" | "30days" | "all";
type AppointmentStatus = "pendente" | "confirmado" | "risco" | "cancelado" | "atendido";

const statusLabels: Record<AppointmentStatus, string> = {
  pendente: "Pendente", confirmado: "Confirmado", risco: "Risco", cancelado: "Cancelado", atendido: "Atendido",
};
const dateFilters: { label: string; value: DateFilter }[] = [
  { label: "7 dias", value: "7days" }, { label: "15 dias", value: "15days" }, { label: "30 dias", value: "30days" }, { label: "Todo período", value: "all" },
];

export default function Clientes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const getFilterDate = () => {
    if (dateFilter === "all") return null;
    const now = new Date();
    switch (dateFilter) {
      case "7days": return startOfDay(subDays(now, 7));
      case "15days": return startOfDay(subDays(now, 15));
      case "30days": return startOfDay(subDays(now, 30));
    }
  };

  const { data: clients } = useQuery({
    queryKey: ["clients", user?.id, dateFilter],
    queryFn: async () => {
      let query = supabase.from("appointments").select("lead_id, service_id, scheduled_at, serviceName, status, id, patientName, professionalName, duracao, price, notes, created_at").eq("user_id", user!.id);
      const filterDate = getFilterDate();
      if (filterDate) query = query.gte("created_at", filterDate.toISOString());
      const { data: appointments, error: aptError } = await query;
      if (aptError) throw aptError;
      const leadIds = [...new Set(appointments?.map((a) => a.lead_id) || [])];
      if (leadIds.length === 0) return [];
      const { data: leads, error: leadError } = await supabase.from("leads").select("*").eq("user_id", user!.id).in("id", leadIds);
      if (leadError) throw leadError;
      return leads?.map((lead) => ({
        ...lead,
        appointments: appointments?.filter((a) => a.lead_id === lead.id).sort((a, b) => compareScheduledAt(b.scheduled_at, a.scheduled_at)) || [],
        appointmentCount: appointments?.filter((a) => a.lead_id === lead.id).length || 0,
        lastAppointment: appointments?.filter((a) => a.lead_id === lead.id).sort((a, b) => compareScheduledAt(b.scheduled_at, a.scheduled_at))[0],
      })) || [];
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["client-stats", user?.id],
    queryFn: async () => {
      const { data: appointments } = await supabase.from("appointments").select("service_id, serviceName, scheduled_at").eq("user_id", user!.id);
      const serviceCounts: Record<string, { name: string; count: number }> = {};
      appointments?.forEach((apt) => { const key = apt.service_id; if (!serviceCounts[key]) serviceCounts[key] = { name: apt.serviceName || "Serviço", count: 0 }; serviceCounts[key].count++; });
      const topService = Object.values(serviceCounts).sort((a, b) => b.count - a.count)[0];
      const dayCounts: Record<number, number> = {};
      appointments?.forEach((apt) => {
        const dateKey = getScheduledDateKey(apt.scheduled_at);
        const day = dateKeyToLocalDate(dateKey).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const topDay = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0];
      return { topService: topService?.name || "N/A", topDay: topDay ? days[parseInt(topDay[0])] : "N/A", totalClients: clients?.length || 0 };
    },
    enabled: !!user && !!clients,
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Agendamento excluído!" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao excluir" }),
  });

  const deleteClient = useMutation({
    mutationFn: async (leadId: string) => {
      // First delete all appointments for this lead
      await supabase.from("appointments").delete().eq("lead_id", leadId);
      // Then delete the lead
      const { error } = await supabase.from("leads").delete().eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsClientModalOpen(false);
      setSelectedClient(null);
      toast({ title: "Cliente excluído!" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao excluir" }),
  });

  return (
    <PageTransition className="h-full flex flex-col gap-3">
      {/* Header - Compact */}
      <FadeIn direction="down" className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-foreground">Clientes</h1>
          <p className="text-xs text-muted-foreground">Leads que já realizaram agendamentos</p>
        </div>
        <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg">
          {dateFilters.map((f) => (
            <Button key={f.value} variant={dateFilter === f.value ? "default" : "ghost"} size="sm" onClick={() => setDateFilter(f.value)} className={`h-6 px-2 text-xs ${dateFilter === f.value ? "" : ""}`}>{f.label}</Button>
          ))}
        </div>
      </FadeIn>

      {/* Stats Row - Compact */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <Card className="shadow-card border-0"><CardContent className="p-3 flex items-center gap-3"><TrendingUp className="h-4 w-4 text-primary" /><div><p className="text-sm font-bold truncate">{stats?.topService || "N/A"}</p><p className="text-[10px] text-muted-foreground">Serviço Popular</p></div></CardContent></Card>
        <Card className="shadow-card border-0"><CardContent className="p-3 flex items-center gap-3"><CalendarIcon className="h-4 w-4 text-primary" /><div><p className="text-sm font-bold">{stats?.topDay || "N/A"}</p><p className="text-[10px] text-muted-foreground">Dia Popular</p></div></CardContent></Card>
        <Card className="shadow-card border-0"><CardContent className="p-3 flex items-center gap-3"><Star className="h-4 w-4 text-primary" /><div><p className="text-sm font-bold">{clients?.length || 0}</p><p className="text-[10px] text-muted-foreground">Total Clientes</p></div></CardContent></Card>
      </div>

      {/* Clients Grid - Fill remaining space */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 content-start overflow-y-auto">
        {clients?.map((client) => (
          <motion.div key={client.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer h-full" onClick={() => { setSelectedClient(client); setIsClientModalOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">{client.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{client.appointmentCount}</Badge>
                  {client.lastAppointment && <span className="text-[10px] text-muted-foreground">{formatDateKeyBR(getScheduledDateKey(client.lastAppointment.scheduled_at))}</span>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {clients?.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">Nenhum cliente encontrado.</div>}
      </div>

      {/* Client Detail Modal */}
      <DetailModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Detalhes do Cliente">
        {selectedClient && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div><Label className="text-muted-foreground text-xs">Nome</Label><p className="font-medium">{selectedClient.name}</p></div>
                <div><Label className="text-muted-foreground text-xs">ID</Label><p className="font-mono text-sm">{selectedClient.id.slice(0, 8)}</p></div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                    <AlertDialogDescription>Isso excluirá o cliente e todos os seus agendamentos. Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteClient.mutate(selectedClient.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Telefone</Label><p>{selectedClient.phone}</p></div>
              <div><Label className="text-muted-foreground text-xs">Email</Label><p>{selectedClient.email || "Não informado"}</p></div>
            </div>
            <div className="border-t pt-4">
              <Label className="text-muted-foreground text-xs">Histórico de Agendamentos</Label>
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {selectedClient.appointments?.map((apt: any) => (
                  <div key={apt.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <StatusIndicator status={apt.status as AppointmentStatus} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{apt.serviceName || "Serviço"}</p>
                        <p className="text-xs text-muted-foreground">{formatISOToDisplay(apt.scheduled_at)}</p>
                      </div>
                      <StatusSelect 
                        value={apt.status as AppointmentStatus} 
                        onValueChange={(status) => updateAppointmentStatus.mutate({ id: apt.id, status })} 
                        size="sm" 
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAppointment.mutate(apt.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DetailModal>

      {/* Appointment Detail Modal */}
      <DetailModal isOpen={isAppointmentModalOpen} onClose={() => setIsAppointmentModalOpen(false)} title="Detalhes do Agendamento">
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <StatusIndicator status={selectedAppointment.status as AppointmentStatus} size="lg" />
              <span className="font-medium text-lg">{statusLabels[selectedAppointment.status as AppointmentStatus]}</span>
              <div className="ml-auto">
                <StatusSelect 
                  value={selectedAppointment.status as AppointmentStatus} 
                  onValueChange={(status) => {
                    updateAppointmentStatus.mutate({ id: selectedAppointment.id, status });
                    setSelectedAppointment({ ...selectedAppointment, status });
                  }} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Serviço</Label><p className="font-medium">{selectedAppointment.serviceName}</p></div>
              <div><Label className="text-muted-foreground text-xs">Profissional</Label><p>{selectedAppointment.professionalName || "N/A"}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Data e Hora</Label><p>{formatISOToDisplay(selectedAppointment.scheduled_at)}</p></div>
              <div><Label className="text-muted-foreground text-xs">Duração</Label><p>{selectedAppointment.duracao ? `${Number(selectedAppointment.duracao)} min` : "N/A"}</p></div>
            </div>
            <div><Label className="text-muted-foreground text-xs">Preço</Label><p className="text-lg font-semibold text-primary">R$ {selectedAppointment.price?.toFixed(2) || "0.00"}</p></div>
          </div>
        )}
      </DetailModal>
    </PageTransition>
  );
}
