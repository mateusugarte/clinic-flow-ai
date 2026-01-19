import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { User, Phone, Clock, Play, Pause, TrendingUp, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DetailModal, StatusIndicator } from "@/components/ui/detail-modal";
import { StatusSelect } from "@/components/ui/status-select";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type LeadQualification = "entrou_em_contato" | "respondendo_duvidas" | "repassando_disponibilidade" | "fez_agendamento" | "repassado_atendimento";
type DateFilter = "today" | "7days" | "15days" | "30days";
type AppointmentStatus = "pendente" | "confirmado" | "risco" | "cancelado" | "atendido";

const columns: { id: LeadQualification; title: string }[] = [
  { id: "entrou_em_contato", title: "Contato" },
  { id: "respondendo_duvidas", title: "Dúvidas" },
  { id: "repassando_disponibilidade", title: "Disponibilidade" },
  { id: "fez_agendamento", title: "Agendado" },
];

const dateFilters: { label: string; value: DateFilter }[] = [
  { label: "Hoje", value: "today" },
  { label: "7 dias", value: "7days" },
  { label: "15 dias", value: "15days" },
  { label: "30 dias", value: "30days" },
];

export default function CRM() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState<DateFilter>("30days");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  
  // Appointment creation state
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [appointmentLeadId, setAppointmentLeadId] = useState<string>("");
  const [appointmentLeadName, setAppointmentLeadName] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProfId, setSelectedProfId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");

  const getFilterDate = () => {
    const now = new Date();
    switch (dateFilter) {
      case "today": return startOfDay(now);
      case "7days": return startOfDay(subDays(now, 7));
      case "15days": return startOfDay(subDays(now, 15));
      case "30days": return startOfDay(subDays(now, 30));
    }
  };

  const { data: leads } = useQuery({
    queryKey: ["leads", user?.id, dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id)
        .gte("last_interaction", getFilterDate().toISOString())
        .order("last_interaction", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allLeads } = useQuery({
    queryKey: ["all-leads-count", user?.id, dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id")
        .eq("user_id", user!.id)
        .gte("created_at", getFilterDate().toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: appointments } = useQuery({
    queryKey: ["appointments-for-conversion", user?.id, dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("lead_id, id, scheduled_at, serviceName, professionalName, status, price")
        .eq("user_id", user!.id)
        .gte("created_at", getFilterDate().toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: services } = useQuery({
    queryKey: ["services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("user_id", user!.id).eq("is_available", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: professionals } = useQuery({
    queryKey: ["professionals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("user_id", user!.id).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("leads").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: () => toast({ variant: "destructive", title: "Erro ao atualizar lead" }),
  });

  const createAppointment = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("appointments").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-for-conversion"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsAppointmentDialogOpen(false);
      resetAppointmentForm();
      toast({ title: "Agendamento criado com sucesso!" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao criar agendamento" }),
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-for-conversion"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const resetAppointmentForm = () => {
    setSelectedServiceId("");
    setSelectedProfId("");
    setAppointmentDate("");
    setAppointmentTime("");
    setAppointmentLeadId("");
    setAppointmentLeadName("");
  };

  const toggleIA = (leadId: string, currentIA: string | null) => {
    const newIA = currentIA === "sim" ? "não" : "sim";
    updateLead.mutate({ id: leadId, updates: { ia: newIA } });
    toast({ title: newIA === "sim" ? "IA ativada" : "IA pausada" });
  };

  const getLeadsForColumn = (q: LeadQualification) => leads?.filter((l) => l.qualification === q) || [];
  const handleDragStart = (leadId: string) => setDraggedLead(leadId);
  const handleDragEnd = () => setDraggedLead(null);
  
  const handleDrop = (qualification: LeadQualification) => {
    if (draggedLead) {
      const lead = leads?.find(l => l.id === draggedLead);
      if (qualification === "fez_agendamento" && lead) {
        // Open appointment dialog
        setAppointmentLeadId(lead.id);
        setAppointmentLeadName(lead.name);
        setIsAppointmentDialogOpen(true);
      } else {
        updateLead.mutate({ id: draggedLead, updates: { qualification } });
      }
      setDraggedLead(null);
    }
  };

  const handleCreateAppointment = () => {
    if (!selectedServiceId || !selectedProfId || !appointmentDate || !appointmentTime) {
      toast({ variant: "destructive", title: "Preencha todos os campos" });
      return;
    }
    const service = services?.find(s => s.id === selectedServiceId);
    const professional = professionals?.find(p => p.id === selectedProfId);
    const lead = leads?.find(l => l.id === appointmentLeadId);
    const scheduledAt = new Date(`${appointmentDate}T${appointmentTime}`);

    createAppointment.mutate({
      user_id: user!.id,
      lead_id: appointmentLeadId,
      service_id: selectedServiceId,
      professional_id: selectedProfId,
      scheduled_at: scheduledAt.toISOString(),
      serviceName: service?.name,
      professionalName: professional?.name,
      patientName: lead?.name,
      phoneNumber: parseInt(lead?.phone?.replace(/\D/g, "") || "0"),
      duracao: service?.duration,
      price: service?.price,
      status: "pendente",
    });

    // Update lead qualification
    updateLead.mutate({ id: appointmentLeadId, updates: { qualification: "fez_agendamento" } });
  };

  const professionalsForService = selectedServiceId ? professionals?.filter(p => p.service_ids?.includes(selectedServiceId)) || [] : [];

  // Conversion rate: unique leads with appointments / total leads * 100
  const totalLeads = allLeads?.length || 0;
  const uniqueLeadsWithAppointments = new Set(appointments?.map(a => a.lead_id) || []).size;
  const conversionRate = totalLeads > 0 ? ((uniqueLeadsWithAppointments / totalLeads) * 100).toFixed(1) : "0";

  const leadsWithIA = leads?.filter(l => l.ia === "sim").length || 0;

  // Get appointments for a specific lead
  const getLeadAppointments = (leadId: string) => appointments?.filter(a => a.lead_id === leadId) || [];

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM / Kanban</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus leads em um pipeline visual</p>
        </div>
        <div className="flex gap-2">
          {dateFilters.map((f) => (
            <Button key={f.value} variant={dateFilter === f.value ? "default" : "outline"} size="sm"
              onClick={() => setDateFilter(f.value)} className={dateFilter === f.value ? "gradient-primary" : ""}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Total de Leads</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{totalLeads}</p></CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-2"><Play className="h-4 w-4 text-primary" />Com IA Ativa</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{leadsWithIA}</p></CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Taxa de Conversão</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">{uniqueLeadsWithAppointments} de {totalLeads} leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board - Fill remaining space */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-0">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col min-h-0" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(column.id)}>
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{column.title}</h3>
              <Badge variant="secondary" className="text-xs">{getLeadsForColumn(column.id).length}</Badge>
            </div>
            <div className="flex-1 space-y-2 p-2 rounded-xl bg-muted/30 border border-border overflow-y-auto">
              {getLeadsForColumn(column.id).map((lead) => {
                const leadAppointments = getLeadAppointments(lead.id);
                return (
                  <motion.div key={lead.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    draggable onDragStart={() => handleDragStart(lead.id)} onDragEnd={handleDragEnd}
                    className={`group cursor-grab active:cursor-grabbing ${draggedLead === lead.id ? "opacity-50" : ""}`}>
                    <Card className="shadow-sm hover:shadow-md transition-all border-l-4 border-l-primary"
                      onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); }}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-xs">{lead.name}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{lead.phone}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleIA(lead.id, lead.ia); }}>
                            {lead.ia === "sim" ? <Pause className="h-3 w-3 text-yellow-500" /> : <Play className="h-3 w-3 text-green-500" />}
                          </Button>
                        </div>
                        {lead.last_interaction && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />{format(new Date(lead.last_interaction), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        )}
                        {/* Show appointment info if exists */}
                        {leadAppointments.length > 0 && (
                          <div className="pt-2 border-t border-border space-y-1">
                            {leadAppointments.slice(0, 2).map(apt => apt.scheduled_at && (
                              <div key={apt.id} className="flex items-center gap-2 text-[10px]">
                                <StatusIndicator status={apt.status as AppointmentStatus} size="sm" />
                                <span className="truncate">{apt.serviceName}</span>
                                <span className="text-muted-foreground">{format(parseISO(apt.scheduled_at), "dd/MM HH:mm")}</span>
                              </div>
                            ))}
                            {leadAppointments.length > 2 && (
                              <p className="text-[10px] text-muted-foreground">+{leadAppointments.length - 2} mais</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
              {getLeadsForColumn(column.id).length === 0 && <div className="text-center py-6 text-muted-foreground text-xs">Nenhum lead</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Lead Modal */}
      <DetailModal isOpen={isLeadModalOpen} onClose={() => setIsLeadModalOpen(false)} title="Detalhes do Lead">
        {selectedLead && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Nome</Label><p className="font-medium">{selectedLead.name}</p></div>
              <div><Label className="text-muted-foreground text-xs">ID</Label><p className="font-mono text-sm">{selectedLead.id.slice(0, 8)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Telefone</Label><p>{selectedLead.phone}</p></div>
              <div><Label className="text-muted-foreground text-xs">Email</Label><p>{selectedLead.email || "Não informado"}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Qualificação</Label><p>{columns.find(c => c.id === selectedLead.qualification)?.title || selectedLead.qualification}</p></div>
              <div><Label className="text-muted-foreground text-xs">IA</Label><p>{selectedLead.ia === "sim" ? "Ativa" : "Pausada"}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-xs">Última Interação</Label><p>{selectedLead.last_interaction ? format(new Date(selectedLead.last_interaction), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "N/A"}</p></div>
              <div><Label className="text-muted-foreground text-xs">Tempo Economizado</Label><p>{selectedLead.tempo_economizado || 0} min</p></div>
            </div>
            {selectedLead.notes && <div><Label className="text-muted-foreground text-xs">Notas</Label><p className="text-sm">{selectedLead.notes}</p></div>}
            {selectedLead.tags?.length > 0 && (
              <div>
                <Label className="text-muted-foreground text-xs">Tags</Label>
                <div className="flex gap-1 flex-wrap mt-1">{selectedLead.tags.map((tag: string, i: number) => <Badge key={i} variant="secondary">{tag}</Badge>)}</div>
              </div>
            )}
            {/* Appointments for this lead */}
            {getLeadAppointments(selectedLead.id).length > 0 && (
              <div className="border-t pt-4">
                <Label className="text-muted-foreground text-xs">Agendamentos</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {getLeadAppointments(selectedLead.id).filter(apt => apt.scheduled_at).map(apt => (
                    <div key={apt.id} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <StatusIndicator status={apt.status as AppointmentStatus} size="md" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{apt.serviceName}</p>
                          <p className="text-xs text-muted-foreground">{format(parseISO(apt.scheduled_at), "dd/MM/yyyy HH:mm")} - {apt.professionalName}</p>
                        </div>
                        <StatusSelect 
                          value={apt.status as AppointmentStatus} 
                          onValueChange={(status) => updateAppointmentStatus.mutate({ id: apt.id, status })} 
                          size="sm" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Appointment Creation Dialog */}
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">Lead</Label>
              <p className="font-medium">{appointmentLeadName}</p>
            </div>
            <div className="space-y-2">
              <Label>Serviço *</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                <SelectContent>
                  {services?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} - R$ {s.price}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Profissional *</Label>
              <Select value={selectedProfId} onValueChange={setSelectedProfId} disabled={!selectedServiceId}>
                <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                <SelectContent>
                  {professionalsForService.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAppointmentDialogOpen(false); resetAppointmentForm(); }}>Cancelar</Button>
            <Button className="gradient-primary" onClick={handleCreateAppointment} disabled={createAppointment.isPending}>
              {createAppointment.isPending ? "Criando..." : "Criar Agendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
