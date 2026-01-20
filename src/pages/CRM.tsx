import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { User, Phone, Clock, Play, Pause, TrendingUp, Users, Calendar, Pencil, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DetailModal, StatusIndicator } from "@/components/ui/detail-modal";
import { StatusSelect } from "@/components/ui/status-select";
import { PageTransition, FadeIn } from "@/components/ui/page-transition";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { extractTimeFromISO, formatISOToShortDisplay } from "@/lib/dateUtils";

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
  { label: "7d", value: "7days" },
  { label: "15d", value: "15days" },
  { label: "30d", value: "30days" },
];

export default function CRM() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState<DateFilter>("30days");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  
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
        .gte("scheduled_at", getFilterDate().toISOString());
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead atualizado!" });
    },
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
      toast({ title: "Agendamento criado!" });
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
  };

  const startEditing = () => {
    setEditForm({
      name: selectedLead?.name || "",
      phone: selectedLead?.phone || "",
      email: selectedLead?.email || "",
      notes: selectedLead?.notes || "",
    });
    setIsEditing(true);
  };

  const saveEdits = () => {
    if (!selectedLead) return;
    updateLead.mutate({ 
      id: selectedLead.id, 
      updates: {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        notes: editForm.notes,
      }
    });
    setSelectedLead({ ...selectedLead, ...editForm });
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const getLeadsForColumn = (q: LeadQualification) => leads?.filter((l) => l.qualification === q) || [];
  const handleDragStart = (leadId: string) => setDraggedLead(leadId);
  const handleDragEnd = () => setDraggedLead(null);
  
  const handleDrop = (qualification: LeadQualification) => {
    if (draggedLead) {
      const lead = leads?.find(l => l.id === draggedLead);
      if (qualification === "fez_agendamento" && lead) {
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

    updateLead.mutate({ id: appointmentLeadId, updates: { qualification: "fez_agendamento" } });
  };

  const professionalsForService = selectedServiceId ? professionals?.filter(p => p.service_ids?.includes(selectedServiceId)) || [] : [];

  const totalLeads = allLeads?.length || 0;
  const uniqueLeadsWithAppointments = new Set(appointments?.map(a => a.lead_id) || []).size;
  const conversionRate = totalLeads > 0 ? ((uniqueLeadsWithAppointments / totalLeads) * 100).toFixed(0) : "0";

  const leadsWithIA = leads?.filter(l => l.ia === "sim").length || 0;

  const getLeadAppointments = (leadId: string) => appointments?.filter(a => a.lead_id === leadId) || [];

  return (
    <PageTransition className="h-full flex flex-col gap-3">
      {/* Header */}
      <FadeIn direction="down" className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-foreground">CRM</h1>
          <p className="text-xs text-muted-foreground">Pipeline de leads</p>
        </div>
        <div className="flex gap-1">
          {dateFilters.map((f) => (
            <Button key={f.value} variant={dateFilter === f.value ? "default" : "ghost"} size="sm"
              onClick={() => setDateFilter(f.value)} 
              className={`h-7 px-2 text-xs ${dateFilter === f.value ? "bg-primary text-primary-foreground" : ""}`}>
              {f.label}
            </Button>
          ))}
        </div>
      </FadeIn>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <Card className="shadow-card border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">{totalLeads}</p>
                <p className="text-2xs text-muted-foreground">Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">{leadsWithIA}</p>
                <p className="text-2xs text-muted-foreground">IA Ativa</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">{conversionRate}%</p>
                <p className="text-2xs text-muted-foreground">Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 min-h-0">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col min-h-0" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(column.id)}>
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="font-medium text-xs text-muted-foreground">{column.title}</h3>
              <Badge variant="secondary" className="text-2xs h-5">{getLeadsForColumn(column.id).length}</Badge>
            </div>
            <div className="flex-1 space-y-1.5 p-2 rounded-lg bg-muted/30 border border-border overflow-y-auto">
              {getLeadsForColumn(column.id).map((lead) => {
                const leadAppointments = getLeadAppointments(lead.id);
                return (
                  <motion.div key={lead.id} layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    draggable onDragStart={() => handleDragStart(lead.id)} onDragEnd={handleDragEnd}
                    className={`group cursor-grab active:cursor-grabbing ${draggedLead === lead.id ? "opacity-50" : ""}`}>
                    <Card className="shadow-sm hover:shadow-card-hover transition-shadow border-l-2 border-l-primary"
                      onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); setIsEditing(false); }}>
                      <CardContent className="p-2 space-y-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs truncate">{lead.name}</p>
                              <p className="text-2xs text-muted-foreground truncate">{lead.phone}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleIA(lead.id, lead.ia); }}>
                            {lead.ia === "sim" ? <Pause className="h-3 w-3 text-warning" /> : <Play className="h-3 w-3 text-success" />}
                          </Button>
                        </div>
                        {lead.last_interaction && (
                          <p className="text-2xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />{format(new Date(lead.last_interaction), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        )}
                        {leadAppointments.length > 0 && (
                          <div className="pt-1.5 border-t border-border space-y-1">
                            {leadAppointments.slice(0, 1).map(apt => apt.scheduled_at && (
                              <div key={apt.id} className="flex items-center gap-1.5 text-2xs">
                                <StatusIndicator status={apt.status as AppointmentStatus} size="sm" />
                                <span className="truncate">{apt.serviceName}</span>
                                <span className="text-muted-foreground">{formatISOToShortDisplay(apt.scheduled_at)}</span>
                              </div>
                            ))}
                            {leadAppointments.length > 1 && (
                              <p className="text-2xs text-muted-foreground">+{leadAppointments.length - 1}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
              {getLeadsForColumn(column.id).length === 0 && <div className="text-center py-4 text-muted-foreground text-xs">Vazio</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Lead Modal */}
      <DetailModal isOpen={isLeadModalOpen} onClose={() => { setIsLeadModalOpen(false); setIsEditing(false); }} title="Detalhes do Lead">
        {selectedLead && (
          <div className="space-y-3">
            {/* Edit/Save buttons */}
            <div className="flex justify-end gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={cancelEditing} className="h-7 text-xs">
                    <X className="h-3 w-3 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveEdits} className="h-7 text-xs bg-primary">
                    <Save className="h-3 w-3 mr-1" /> Salvar
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={startEditing} className="h-7 text-xs">
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <Input 
                      value={editForm.name} 
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <Input 
                      value={editForm.phone} 
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input 
                    value={editForm.email} 
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Notas</Label>
                  <Textarea 
                    value={editForm.notes} 
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    className="text-xs min-h-[60px]"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-2xs text-muted-foreground">Nome</Label><p className="text-sm font-medium">{selectedLead.name}</p></div>
                  <div><Label className="text-2xs text-muted-foreground">ID</Label><p className="font-mono text-xs">{selectedLead.id.slice(0, 8)}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-2xs text-muted-foreground">Telefone</Label><p className="text-xs">{selectedLead.phone}</p></div>
                  <div><Label className="text-2xs text-muted-foreground">Email</Label><p className="text-xs">{selectedLead.email || "—"}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-2xs text-muted-foreground">Qualificação</Label><p className="text-xs">{columns.find(c => c.id === selectedLead.qualification)?.title || selectedLead.qualification}</p></div>
                  <div><Label className="text-2xs text-muted-foreground">IA</Label><p className="text-xs">{selectedLead.ia === "sim" ? "Ativa" : "Pausada"}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-2xs text-muted-foreground">Última Interação</Label><p className="text-xs">{selectedLead.last_interaction ? format(new Date(selectedLead.last_interaction), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</p></div>
                  <div><Label className="text-2xs text-muted-foreground">Tempo Economizado</Label><p className="text-xs">{selectedLead.tempo_economizado || 0} min</p></div>
                </div>
                {selectedLead.notes && <div><Label className="text-2xs text-muted-foreground">Notas</Label><p className="text-xs">{selectedLead.notes}</p></div>}
                {selectedLead.tags?.length > 0 && (
                  <div>
                    <Label className="text-2xs text-muted-foreground">Tags</Label>
                    <div className="flex gap-1 flex-wrap mt-1">{selectedLead.tags.map((tag: string, i: number) => <Badge key={i} variant="secondary" className="text-2xs">{tag}</Badge>)}</div>
                  </div>
                )}
              </>
            )}
            
            {/* Appointments */}
            {getLeadAppointments(selectedLead.id).length > 0 && (
              <div className="border-t pt-3">
                <Label className="text-2xs text-muted-foreground">Agendamentos</Label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {getLeadAppointments(selectedLead.id).filter(apt => apt.scheduled_at).map(apt => (
                    <div key={apt.id} className="p-2 rounded border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <StatusIndicator status={apt.status as AppointmentStatus} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{apt.serviceName}</p>
                          <p className="text-2xs text-muted-foreground">{formatISOToShortDisplay(apt.scheduled_at)} • {apt.professionalName}</p>
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Criar Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-2 bg-muted rounded">
              <Label className="text-2xs text-muted-foreground">Lead</Label>
              <p className="text-xs font-medium">{appointmentLeadName}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Serviço</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {services?.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name} - R$ {s.price}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Profissional</Label>
              <Select value={selectedProfId} onValueChange={setSelectedProfId} disabled={!selectedServiceId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {professionalsForService.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora</Label>
                <Input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setIsAppointmentDialogOpen(false); resetAppointmentForm(); }} className="h-8 text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleCreateAppointment} disabled={createAppointment.isPending} className="h-8 text-xs bg-primary">
              {createAppointment.isPending ? "..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
