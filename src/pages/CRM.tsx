import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { User, Phone, Clock, Play, Pause, TrendingUp, Users, Calendar, Pencil, Save, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DetailModal, StatusIndicator } from "@/components/ui/detail-modal";
import { StatusSelect } from "@/components/ui/status-select";
import { PageTransition, FadeIn } from "@/components/ui/page-transition";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { extractTimeFromISO, formatISOToShortDisplay, formatISOToDisplay } from "@/lib/dateUtils";
import { toStoredScheduledAt, getScheduledDateKey } from "@/lib/scheduledAt";

function filterStartTs(date: Date) {
  const key = format(date, "yyyy-MM-dd");
  return `${key} 00:00:00+00`;
}

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
        .select("lead_id, id, scheduled_at, professional_id, duracao, service_id, serviceName, professionalName, status, price")
        .eq("user_id", user!.id)
        .gte("scheduled_at", filterStartTs(getFilterDate()));
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

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-for-conversion"] });
      toast({ title: "Agendamento excluído!" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao excluir" }),
  });

  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      await supabase.from("appointments").delete().eq("lead_id", leadId);
      const { error } = await supabase.from("leads").delete().eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-for-conversion"] });
      setIsLeadModalOpen(false);
      setSelectedLead(null);
      toast({ title: "Lead excluído!" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao excluir" }),
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
    const scheduledAt = toStoredScheduledAt(appointmentDate, appointmentTime);

    createAppointment.mutate({
      user_id: user!.id,
      lead_id: appointmentLeadId,
      service_id: selectedServiceId,
      professional_id: selectedProfId,
      scheduled_at: scheduledAt,
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

  // Generate available time slots for a professional on a given date
  const getAvailableTimeSlots = (professionalId: string, date: string): string[] => {
    const professional = professionals?.find(p => p.id === professionalId);
    if (!professional) return [];

    const startTime = professional.start_time || "08:00";
    const endTime = professional.end_time || "18:00";
    const intervalMin = professional.interval_min || 30;

    // Get the selected service duration
    const selectedService = services?.find(s => s.id === selectedServiceId);
    const serviceDuration = selectedService?.duration || intervalMin;

    // Parse start and end times
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    // Get existing appointments for this professional on this date
    const existingAppointments = appointments?.filter((apt: any) => {
      return apt.professional_id === professionalId && getScheduledDateKey(apt.scheduled_at) === date;
    }) || [];

    // Generate all possible slots
    const slots: string[] = [];
    let currentTime = new Date(2000, 0, 1, startHour, startMinute);
    const endDateTime = new Date(2000, 0, 1, endHour, endMinute);

    while (currentTime < endDateTime) {
      const timeStr = format(currentTime, "HH:mm");
      const slotEnd = addMinutes(currentTime, serviceDuration);
      
      if (slotEnd <= endDateTime) {
        const hasConflict = existingAppointments.some((apt: any) => {
          const aptTime = extractTimeFromISO(apt.scheduled_at);
          const aptDuration = Number(apt.duracao) || intervalMin;
          
          const aptStart = new Date(2000, 0, 1, parseInt(aptTime.split(":")[0]), parseInt(aptTime.split(":")[1]));
          const aptEnd = addMinutes(aptStart, aptDuration);
          
          return (currentTime < aptEnd && slotEnd > aptStart);
        });

        if (!hasConflict) {
          slots.push(timeStr);
        }
      }

      currentTime = addMinutes(currentTime, intervalMin);
    }

    return slots;
  };

  const availableSlots = selectedProfId && appointmentDate 
    ? getAvailableTimeSlots(selectedProfId, appointmentDate) 
    : [];

  const totalLeads = allLeads?.length || 0;
  const uniqueLeadsWithAppointments = new Set(appointments?.map(a => a.lead_id) || []).size;
  const conversionRate = totalLeads > 0 ? ((uniqueLeadsWithAppointments / totalLeads) * 100).toFixed(0) : "0";

  const leadsWithIA = leads?.filter(l => l.ia === "sim").length || 0;

  const getLeadAppointments = (leadId: string) => appointments?.filter(a => a.lead_id === leadId) || [];

  return (
    <PageTransition className="h-full flex flex-col gap-4">
      {/* Header */}
      <FadeIn direction="down" className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Pipeline de Leads</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie seus contatos e conversões</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
          {dateFilters.map((f) => (
            <Button key={f.value} variant={dateFilter === f.value ? "default" : "ghost"} size="sm"
              onClick={() => setDateFilter(f.value)} 
              className={`h-7 px-3 text-xs font-medium transition-all ${dateFilter === f.value ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"}`}>
              {f.label}
            </Button>
          ))}
        </div>
      </FadeIn>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0">
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <Card className="shadow-card hover:shadow-card-hover transition-shadow border overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight">{totalLeads}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total de Leads</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <Card className="shadow-card hover:shadow-card-hover transition-shadow border overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight">{leadsWithIA}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">IA Ativa</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Play className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <Card className="shadow-card hover:shadow-card-hover transition-shadow border overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Taxa de Conversão</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-0">
        {columns.map((column, colIndex) => (
          <motion.div 
            key={column.id} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: colIndex * 0.05 }}
            className="flex flex-col min-h-0" 
            onDragOver={(e) => e.preventDefault()} 
            onDrop={() => handleDrop(column.id)}
          >
            <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${column.id === 'fez_agendamento' ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                <h3 className="font-semibold text-sm text-foreground">{column.title}</h3>
              </div>
              <Badge variant="outline" className="text-2xs h-5 px-2 font-medium">{getLeadsForColumn(column.id).length}</Badge>
            </div>
            <div className="flex-1 space-y-2 p-3 rounded-xl bg-muted/40 border border-border/50 overflow-y-auto">
              {getLeadsForColumn(column.id).map((lead, index) => {
                const leadAppointments = getLeadAppointments(lead.id);
                return (
                  <motion.div 
                    key={lead.id} 
                    layout 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    whileHover={{ scale: 1.02 }}
                    draggable 
                    onDragStart={() => handleDragStart(lead.id)} 
                    onDragEnd={handleDragEnd}
                    className={`group cursor-grab active:cursor-grabbing ${draggedLead === lead.id ? "opacity-50" : ""}`}
                  >
                    <Card 
                      className="shadow-sm hover:shadow-card-hover transition-all border bg-card cursor-pointer"
                      onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); setIsEditing(false); }}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{lead.name}</p>
                              <p className="text-2xs text-muted-foreground truncate flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                {lead.phone}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-6 w-6 flex-shrink-0 rounded-full transition-colors ${lead.ia === "sim" ? "bg-warning/10 hover:bg-warning/20" : "bg-success/10 hover:bg-success/20"}`}
                            onClick={(e) => { e.stopPropagation(); toggleIA(lead.id, lead.ia); }}
                          >
                            {lead.ia === "sim" ? <Pause className="h-3 w-3 text-warning" /> : <Play className="h-3 w-3 text-success" />}
                          </Button>
                        </div>
                        {lead.last_interaction && (
                          <p className="text-2xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/50">
                            <Clock className="h-2.5 w-2.5" />{formatISOToShortDisplay(lead.last_interaction)}
                          </p>
                        )}
                        {leadAppointments.length > 0 && (
                          <div className="pt-2 border-t border-border/50 space-y-1.5">
                            {leadAppointments.slice(0, 1).map(apt => apt.scheduled_at && (
                              <div key={apt.id} className="flex items-center gap-2 text-2xs p-1.5 rounded-lg bg-muted/50">
                                <StatusIndicator status={apt.status as AppointmentStatus} size="sm" />
                                <span className="truncate font-medium">{apt.serviceName}</span>
                                <span className="text-muted-foreground ml-auto">{formatISOToShortDisplay(apt.scheduled_at)}</span>
                              </div>
                            ))}
                            {leadAppointments.length > 1 && (
                              <p className="text-2xs text-muted-foreground text-center">+{leadAppointments.length - 1} agendamento(s)</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
              {getLeadsForColumn(column.id).length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">Nenhum lead</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lead Modal */}
      <DetailModal isOpen={isLeadModalOpen} onClose={() => { setIsLeadModalOpen(false); setIsEditing(false); }} title="Detalhes do Lead">
        {selectedLead && (
          <div className="space-y-4">
            {/* Edit/Save buttons */}
            <div className="flex justify-end gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={cancelEditing} className="h-8 text-xs">
                    <X className="h-3 w-3 mr-1.5" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveEdits} className="h-8 text-xs bg-primary">
                    <Save className="h-3 w-3 mr-1.5" /> Salvar
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={startEditing} className="h-8 text-xs">
                  <Pencil className="h-3 w-3 mr-1.5" /> Editar
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Nome</Label>
                    <Input 
                      value={editForm.name} 
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Telefone</Label>
                    <Input 
                      value={editForm.phone} 
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                  <Input 
                    value={editForm.email} 
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Notas</Label>
                  <Textarea 
                    value={editForm.notes} 
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    className="min-h-[80px] resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Lead Info Card */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-base truncate">{selectedLead.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{selectedLead.id.slice(0, 8)}</p>
                    </div>
                    <Badge variant={selectedLead.ia === "sim" ? "default" : "secondary"} className="text-2xs">
                      {selectedLead.ia === "sim" ? "IA Ativa" : "IA Pausada"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/30">
                      <p className="text-2xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Phone className="h-3 w-3" /> Telefone
                      </p>
                      <p className="text-sm font-medium">{selectedLead.phone}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/30">
                      <p className="text-2xs text-muted-foreground mb-1">Email</p>
                      <p className="text-sm font-medium truncate">{selectedLead.email || "—"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/30">
                      <p className="text-2xs text-muted-foreground mb-1">Qualificação</p>
                      <p className="text-sm font-medium">{columns.find(c => c.id === selectedLead.qualification)?.title || selectedLead.qualification}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/30">
                      <p className="text-2xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Clock className="h-3 w-3" /> Última Interação
                      </p>
                      <p className="text-sm font-medium">{selectedLead.last_interaction ? formatISOToDisplay(selectedLead.last_interaction) : "—"}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-background/50 border border-border/30">
                    <p className="text-2xs text-muted-foreground mb-1">Tempo Economizado pela IA</p>
                    <p className="text-sm font-medium">{selectedLead.tempo_economizado || 0} minutos</p>
                  </div>
                </div>

                {selectedLead.notes && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <Label className="text-2xs text-muted-foreground">Notas</Label>
                    <p className="text-sm mt-1">{selectedLead.notes}</p>
                  </div>
                )}

                {selectedLead.tags?.length > 0 && (
                  <div>
                    <Label className="text-2xs text-muted-foreground">Tags</Label>
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                      {selectedLead.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-2xs px-2 py-0.5">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Appointments */}
            {getLeadAppointments(selectedLead.id).length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs font-medium">Agendamentos ({getLeadAppointments(selectedLead.id).length})</Label>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getLeadAppointments(selectedLead.id).filter(apt => apt.scheduled_at).map(apt => (
                    <div key={apt.id} className="p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <StatusIndicator status={apt.status as AppointmentStatus} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{apt.serviceName}</p>
                          <p className="text-2xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatISOToShortDisplay(apt.scheduled_at)} • {apt.professionalName}
                          </p>
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
                <Input type="date" value={appointmentDate} onChange={(e) => { setAppointmentDate(e.target.value); setAppointmentTime(""); }} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora {availableSlots.length > 0 && <span className="text-muted-foreground">({availableSlots.length})</span>}</Label>
                <Select value={appointmentTime} onValueChange={setAppointmentTime} disabled={!selectedProfId || !appointmentDate}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => <SelectItem key={slot} value={slot} className="text-xs">{slot}</SelectItem>)
                    ) : (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        {!selectedProfId ? "Selecione profissional" : !appointmentDate ? "Selecione data" : "Sem horários"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
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
