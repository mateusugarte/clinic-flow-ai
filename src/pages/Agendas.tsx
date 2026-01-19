import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, User, Search, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailModal, StatusIndicator } from "@/components/ui/detail-modal";
import { StatusSelect } from "@/components/ui/status-select";
import { GlassCalendar } from "@/components/ui/glass-calendar";
import ProfessionalsTable from "@/components/ui/professionals-table";

type AppointmentStatus = "pendente" | "confirmado" | "risco" | "cancelado" | "atendido";

const statusLabels: Record<AppointmentStatus, string> = {
  pendente: "Pendente", confirmado: "Confirmado", risco: "Risco", cancelado: "Cancelado", atendido: "Atendido",
};

export default function Agendas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNewProfOpen, setIsNewProfOpen] = useState(false);
  const [isEditProfOpen, setIsEditProfOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<any>(null);
  const [newProfName, setNewProfName] = useState("");
  const [newProfServiceIds, setNewProfServiceIds] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isAppointmentSheetOpen, setIsAppointmentSheetOpen] = useState(false);
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [appointmentTab, setAppointmentTab] = useState<"existing" | "new">("existing");
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProfId, setSelectedProfId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");

  const { data: allProfessionals } = useQuery({
    queryKey: ["all-professionals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const professionals = allProfessionals?.filter(p => p.is_active);

  const toggleProfessionalActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("professionals").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-professionals"] });
      toast({ title: "Status do profissional atualizado!" });
    },
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

  const { data: leads } = useQuery({
    queryKey: ["leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: appointments } = useQuery({
    queryKey: ["appointments", user?.id, selectedProfessional, currentDate],
    queryFn: async () => {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      let query = supabase.from("appointments").select("*, leads(name, phone)").eq("user_id", user!.id).gte("scheduled_at", startOfMonth.toISOString()).lte("scheduled_at", endOfMonth.toISOString());
      if (selectedProfessional && selectedProfessional !== "all") query = query.eq("professional_id", selectedProfessional);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createProfessional = useMutation({
    mutationFn: async ({ name, serviceIds }: { name: string; serviceIds: string[] }) => {
      const { error } = await supabase.from("professionals").insert({ name, user_id: user!.id, service_ids: serviceIds });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-professionals"] });
      setNewProfName("");
      setNewProfServiceIds([]);
      setIsNewProfOpen(false);
      toast({ title: "Profissional criado com sucesso!" });
    },
  });

  const createLead = useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      const { data, error } = await supabase.from("leads").insert({ name, phone, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const createAppointment = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("appointments").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      resetAppointmentForm();
      setIsNewAppointmentOpen(false);
      toast({ title: "Agendamento criado com sucesso!" });
    },
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const resetAppointmentForm = () => {
    setSelectedLead(null);
    setLeadSearch("");
    setSelectedServiceId("");
    setSelectedProfId("");
    setAppointmentDate("");
    setAppointmentTime("");
    setAppointmentNotes("");
    setNewLeadName("");
    setNewLeadPhone("");
    setAppointmentTab("existing");
  };

  const getAppointmentsForDay = (day: number) => {
    if (!appointments) return [];
    return appointments.filter((apt) => new Date(apt.scheduled_at).getDate() === day);
  };

  const handleGlassCalendarDateSelect = (date: Date) => {
    setCurrentDate(date);
    setSelectedDay(date.getDate());
    setIsDaySheetOpen(true);
  };

  const handleCreateAppointment = async () => {
    let leadId = selectedLead?.id;
    if (appointmentTab === "new") {
      if (!newLeadName || !newLeadPhone) { toast({ variant: "destructive", title: "Preencha nome e telefone" }); return; }
      const newLead = await createLead.mutateAsync({ name: newLeadName, phone: newLeadPhone });
      leadId = newLead.id;
    }
    if (!leadId || !selectedServiceId || !selectedProfId || !appointmentDate || !appointmentTime) { toast({ variant: "destructive", title: "Preencha todos os campos" }); return; }
    const service = services?.find(s => s.id === selectedServiceId);
    const professional = professionals?.find(p => p.id === selectedProfId);
    const lead = appointmentTab === "existing" ? selectedLead : { name: newLeadName, phone: newLeadPhone };
    const scheduledAt = new Date(`${appointmentDate}T${appointmentTime}`);
    createAppointment.mutate({
      user_id: user!.id, lead_id: leadId, service_id: selectedServiceId, professional_id: selectedProfId,
      scheduled_at: scheduledAt.toISOString(), serviceName: service?.name, professionalName: professional?.name,
      patientName: lead?.name, phoneNumber: parseInt(lead?.phone?.replace(/\D/g, "") || "0"),
      duracao: service?.duration, price: service?.price, notes: appointmentNotes, status: "pendente",
    });
  };

  const appointmentsByDate = appointments?.reduce((acc, apt) => {
    const dateKey = format(new Date(apt.scheduled_at), "yyyy-MM-dd");
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const filteredLeads = leads?.filter(lead => lead.name.toLowerCase().includes(leadSearch.toLowerCase()) || lead.phone.includes(leadSearch)) || [];
  const professionalsForService = selectedServiceId ? professionals?.filter(p => p.service_ids?.includes(selectedServiceId)) || [] : [];

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agendas</h1>
          <p className="text-sm text-muted-foreground">Visualize e gerencie agendamentos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {professionals?.map((prof) => <SelectItem key={prof.id} value={prof.id}>{prof.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={isNewProfOpen} onOpenChange={setIsNewProfOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Profissional</Button></DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Profissional</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={newProfName} onChange={(e) => setNewProfName(e.target.value)} placeholder="Nome" /></div>
                <div className="space-y-2">
                  <Label>Serviços</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                    {services?.map((service) => (
                      <div key={service.id} className="flex items-center space-x-2">
                        <Checkbox id={`s-${service.id}`} checked={newProfServiceIds.includes(service.id)} onCheckedChange={(checked) => setNewProfServiceIds(checked ? [...newProfServiceIds, service.id] : newProfServiceIds.filter(id => id !== service.id))} />
                        <label htmlFor={`s-${service.id}`} className="text-sm">{service.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => createProfessional.mutate({ name: newProfName, serviceIds: newProfServiceIds })} disabled={!newProfName} className="w-full gradient-primary">Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setIsNewAppointmentOpen(true)} className="gradient-primary" size="sm"><Plus className="h-4 w-4 mr-1" />Agendamento</Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Calendar */}
        <div className="col-span-12 lg:col-span-5 overflow-hidden">
          <GlassCalendar selectedDate={currentDate} onDateSelect={handleGlassCalendarDateSelect} appointmentsByDate={appointmentsByDate} onNewAppointment={() => setIsNewAppointmentOpen(true)} />
        </div>

        {/* Professionals Table */}
        <div className="col-span-12 lg:col-span-7 overflow-auto">
          <ProfessionalsTable
            professionals={allProfessionals || []}
            services={services || []}
            onToggleActive={(id, isActive) => toggleProfessionalActive.mutate({ id, is_active: isActive })}
            onRowClick={(prof) => { setEditingProfessional(prof); setIsEditProfOpen(true); }}
          />
        </div>
      </div>

      {/* Day Modal */}
      <DetailModal isOpen={isDaySheetOpen} onClose={() => setIsDaySheetOpen(false)} title={selectedDay ? `Agendamentos - ${format(new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay), "dd 'de' MMMM", { locale: ptBR })}` : "Agendamentos"}>
        <div className="space-y-3">
          {selectedDay && getAppointmentsForDay(selectedDay).length > 0 ? (
            getAppointmentsForDay(selectedDay).map((apt) => (
              <div key={apt.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <StatusIndicator status={apt.status as AppointmentStatus} size="md" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{apt.patientName || "Paciente"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(apt.scheduled_at), "HH:mm")} - {apt.serviceName}</p>
                  </div>
                  <StatusSelect value={apt.status as AppointmentStatus} onValueChange={(status) => updateAppointmentStatus.mutate({ id: apt.id, status })} size="sm" />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-6">Nenhum agendamento</p>
          )}
        </div>
      </DetailModal>

      {/* New Appointment Dialog */}
      <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
          <Tabs value={appointmentTab} onValueChange={(v) => setAppointmentTab(v as "existing" | "new")}>
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="existing">Lead Existente</TabsTrigger><TabsTrigger value="new">Novo Lead</TabsTrigger></TabsList>
            <TabsContent value="existing" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label>Buscar Lead</Label>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} placeholder="Buscar..." className="pl-10" /></div>
                {leadSearch && (
                  <div className="max-h-32 overflow-y-auto border rounded-lg">
                    {filteredLeads.map((lead) => (
                      <div key={lead.id} onClick={() => { setSelectedLead(lead); setLeadSearch(""); }} className={`p-2 cursor-pointer hover:bg-muted ${selectedLead?.id === lead.id ? 'bg-primary/10' : ''}`}>
                        <p className="font-medium text-sm">{lead.name}</p><p className="text-xs text-muted-foreground">{lead.phone}</p>
                      </div>
                    ))}
                  </div>
                )}
                {selectedLead && <div className="p-2 bg-primary/10 rounded-lg"><p className="font-medium text-sm">{selectedLead.name}</p><p className="text-xs text-muted-foreground">{selectedLead.phone}</p></div>}
              </div>
            </TabsContent>
            <TabsContent value="new" className="space-y-3 mt-3">
              <div className="space-y-2"><Label>Nome *</Label><Input value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} /></div>
              <div className="space-y-2"><Label>WhatsApp *</Label><Input value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} /></div>
            </TabsContent>
          </Tabs>
          <div className="space-y-3 mt-3">
            <div className="space-y-2"><Label>Serviço *</Label><Select value={selectedServiceId} onValueChange={setSelectedServiceId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{services?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Profissional *</Label><Select value={selectedProfId} onValueChange={setSelectedProfId} disabled={!selectedServiceId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{professionalsForService.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Data *</Label><Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Hora *</Label><Input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={appointmentNotes} onChange={(e) => setAppointmentNotes(e.target.value)} /></div>
            <Button onClick={handleCreateAppointment} className="w-full gradient-primary" disabled={createAppointment.isPending}>Criar Agendamento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
