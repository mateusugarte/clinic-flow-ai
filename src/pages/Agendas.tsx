import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, addMinutes, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { extractTimeFromISO, extractDateTimeFromISO } from "@/lib/dateUtils";
import { getScheduledDateKey, toStoredScheduledAt } from "@/lib/scheduledAt";

function dayStartTs(dateKey: string) {
  return `${dateKey} 00:00:00+00`;
}

function dayEndTs(dateKey: string) {
  return `${dateKey} 23:59:59+00`;
}
import { Plus, User, Search, Edit, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Users, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailModal, StatusIndicator } from "@/components/ui/detail-modal";
import { StatusSelect } from "@/components/ui/status-select";
import ProfessionalsTable from "@/components/ui/professionals-table";
import { PageTransition, StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/page-transition";
import { cn } from "@/lib/utils";

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
  const [editProfServiceIds, setEditProfServiceIds] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isAppointmentSheetOpen, setIsAppointmentSheetOpen] = useState(false);
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
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

  const { data: allServices } = useQuery({
    queryKey: ["all-services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const services = allServices?.filter(s => s.is_available);

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
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Build month bounds without JS UTC conversion.
      const monthStartKey = format(monthStart, "yyyy-MM-dd");
      const monthEndKey = format(monthEnd, "yyyy-MM-dd");
      let query = supabase
        .from("appointments")
        .select("*, leads(name, phone)")
        .eq("user_id", user!.id)
        .gte("scheduled_at", dayStartTs(monthStartKey))
        .lte("scheduled_at", dayEndTs(monthEndKey));
      if (selectedProfessional && selectedProfessional !== "all") query = query.eq("professional_id", selectedProfessional);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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

  const updateProfessional = useMutation({
    mutationFn: async ({ id, name, serviceIds, startTime, endTime }: { id: string; name: string; serviceIds: string[]; startTime: string; endTime: string }) => {
      const { error } = await supabase.from("professionals").update({ name, service_ids: serviceIds, start_time: startTime, end_time: endTime }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-professionals"] });
      setIsEditProfOpen(false);
      setEditingProfessional(null);
      toast({ title: "Profissional atualizado!" });
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

  const updateAppointment = useMutation({
    mutationFn: async (data: { id: string; service_id: string; professional_id: string; scheduled_at: string; notes: string; serviceName: string; professionalName: string; duracao: number; price: number }) => {
      const { error } = await supabase.from("appointments").update({
        service_id: data.service_id,
        professional_id: data.professional_id,
        scheduled_at: data.scheduled_at,
        notes: data.notes,
        serviceName: data.serviceName,
        professionalName: data.professionalName,
        duracao: data.duracao,
        price: data.price,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsEditAppointmentOpen(false);
      setEditingAppointment(null);
      toast({ title: "Agendamento atualizado!" });
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

  const openEditAppointment = (apt: any) => {
    // Use extractDateTimeFromISO to get correct time without timezone conversion
    const { date, time } = extractDateTimeFromISO(apt.scheduled_at);
    setEditingAppointment({
      ...apt,
      date,
      time,
    });
    setIsEditAppointmentOpen(true);
  };

  const handleUpdateAppointment = () => {
    if (!editingAppointment) return;
    const service = allServices?.find(s => s.id === editingAppointment.service_id);
    const professional = allProfessionals?.find(p => p.id === editingAppointment.professional_id);
    const scheduledAt = toStoredScheduledAt(editingAppointment.date, editingAppointment.time);
    updateAppointment.mutate({
      id: editingAppointment.id,
      service_id: editingAppointment.service_id,
      professional_id: editingAppointment.professional_id,
      scheduled_at: scheduledAt,
      notes: editingAppointment.notes || "",
      serviceName: service?.name || "",
      professionalName: professional?.name || "",
      duracao: service?.duration || 0,
      price: service?.price || 0,
    });
  };

  const getAppointmentsForDay = (date: Date) => {
    if (!appointments) return [];
    const targetKey = format(date, "yyyy-MM-dd");
    return appointments.filter((apt) => getScheduledDateKey(apt.scheduled_at) === targetKey);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
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
    const scheduledAt = toStoredScheduledAt(appointmentDate, appointmentTime);
    createAppointment.mutate({
      user_id: user!.id, lead_id: leadId, service_id: selectedServiceId, professional_id: selectedProfId,
      scheduled_at: scheduledAt, serviceName: service?.name, professionalName: professional?.name,
      patientName: lead?.name, phoneNumber: parseInt(lead?.phone?.replace(/\D/g, "") || "0"),
      duracao: service?.duration, price: service?.price, notes: appointmentNotes, status: "pendente",
    });
  };

  const openEditProfessional = (prof: any) => {
    setEditingProfessional(prof);
    setEditProfServiceIds(prof.service_ids || []);
    setIsEditProfOpen(true);
  };

  const filteredLeads = leads?.filter(lead => lead.name.toLowerCase().includes(leadSearch.toLowerCase()) || lead.phone.includes(leadSearch)) || [];
  const professionalsForService = selectedServiceId ? professionals?.filter(p => p.service_ids?.includes(selectedServiceId)) || [] : [];

  // Generate available time slots for a professional on a given date
  const getAvailableTimeSlots = (professionalId: string, date: string): string[] => {
    const professional = allProfessionals?.find(p => p.id === professionalId);
    if (!professional) return [];

    const startTime = professional.start_time || "08:00";
    const endTime = professional.end_time || "18:00";
    const intervalMin = professional.interval_min || 30;

    // Get the selected service duration
    const selectedService = allServices?.find(s => s.id === selectedServiceId);
    const serviceDuration = selectedService?.duration || intervalMin;

    // Parse start and end times
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    // Get existing appointments for this professional on this date
    const existingAppointments = appointments?.filter(apt => {
      const { date: aptDate } = extractDateTimeFromISO(apt.scheduled_at);
      return apt.professional_id === professionalId && aptDate === date;
    }) || [];

    // Generate all possible slots
    const slots: string[] = [];
    let currentTime = new Date(2000, 0, 1, startHour, startMinute);
    const endDateTime = new Date(2000, 0, 1, endHour, endMinute);

    while (currentTime < endDateTime) {
      const timeStr = format(currentTime, "HH:mm");
      const slotEnd = addMinutes(currentTime, serviceDuration);
      
      // Check if slot is before end time
      if (slotEnd <= endDateTime) {
        // Check for conflicts with existing appointments
        const hasConflict = existingAppointments.some(apt => {
          const aptTime = extractTimeFromISO(apt.scheduled_at);
          const aptDuration = Number(apt.duracao) || intervalMin;
          
          const aptStart = new Date(2000, 0, 1, parseInt(aptTime.split(":")[0]), parseInt(aptTime.split(":")[1]));
          const aptEnd = addMinutes(aptStart, aptDuration);
          
          // Check if new slot overlaps with existing appointment
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

  // Available slots for new appointment
  const availableSlots = selectedProfId && appointmentDate 
    ? getAvailableTimeSlots(selectedProfId, appointmentDate) 
    : [];

  // Available slots for editing appointment (exclude current appointment from conflict check)
  const editAvailableSlots = editingAppointment?.professional_id && editingAppointment?.date
    ? getAvailableTimeSlots(editingAppointment.professional_id, editingAppointment.date).concat(
        // Always include current time as available
        [editingAppointment.time].filter(Boolean)
      ).filter((v, i, a) => a.indexOf(v) === i).sort()
    : [];

  // Calendar helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = [];
  const startDay = monthStart.getDay();
  
  for (let i = 0; i < startDay; i++) {
    daysInMonth.push(null);
  }
  for (let i = 1; i <= monthEnd.getDate(); i++) {
    daysInMonth.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const appointmentsByDate = appointments?.reduce((acc, apt) => {
    const dateKey = getScheduledDateKey(apt.scheduled_at);
    if (dateKey) acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todaysAppointments = appointments?.filter((apt: any) => getScheduledDateKey(apt.scheduled_at) === todayKey) || [];

  return (
    <PageTransition className="h-full flex flex-col gap-3">
      {/* Header - Compact */}
      <FadeIn direction="down" className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-foreground">Agendas</h1>
          <p className="text-xs text-muted-foreground">Visualize e gerencie agendamentos</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
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
                    {allServices?.map((service) => (
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
      </FadeIn>

      {/* Grid Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 overflow-y-auto">
        {/* Main Calendar */}
        <Card className="col-span-12 lg:col-span-5 shadow-card flex flex-col min-h-[380px]">
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <CardTitle className="text-sm font-semibold capitalize">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
              {daysInMonth.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="min-h-[40px]" />;
                const dateKey = format(day, "yyyy-MM-dd");
                const count = appointmentsByDate[dateKey] || 0;
                const isTodayDate = isToday(day);
                return (
                  <button
                    key={dateKey}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "min-h-[40px] rounded-lg flex flex-col items-center justify-center text-sm transition-colors hover:bg-muted relative",
                      isTodayDate && "ring-2 ring-primary",
                      count > 0 && "bg-primary/10"
                    )}
                  >
                    <span className={cn("font-medium", isTodayDate && "text-primary")}>{day.getDate()}</span>
                    {count > 0 && (
                      <span className="absolute bottom-0.5 text-[10px] text-primary font-semibold">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="col-span-12 lg:col-span-4 shadow-card flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Hoje
              <Badge variant="secondary" className="ml-auto">{todaysAppointments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2">
            {todaysAppointments.length > 0 ? todaysAppointments.map((apt) => (
              <div key={apt.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => openEditAppointment(apt)}>
                <div className="flex items-center gap-3">
                  <StatusIndicator status={apt.status as AppointmentStatus} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{apt.patientName || "Paciente"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{extractTimeFromISO(apt.scheduled_at)} - {apt.serviceName}
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <StatusSelect value={apt.status as AppointmentStatus} onValueChange={(status) => updateAppointmentStatus.mutate({ id: apt.id, status })} size="sm" />
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-6 text-sm">Nenhum agendamento hoje</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="col-span-12 lg:col-span-3 grid grid-rows-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allProfessionals?.filter(p => p.is_active).length || 0}</p>
                <p className="text-xs text-muted-foreground">Profissionais Ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{services?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Serviços Disponíveis</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointments?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Agendamentos no Mês</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Professionals Table */}
        <div className="col-span-12 overflow-auto">
          <ProfessionalsTable
            professionals={allProfessionals || []}
            services={allServices || []}
            onToggleActive={(id, isActive) => toggleProfessionalActive.mutate({ id, is_active: isActive })}
            onRowClick={(prof) => openEditProfessional(prof)}
          />
        </div>
      </div>

      {/* Edit Professional Modal */}
      <Dialog open={isEditProfOpen} onOpenChange={setIsEditProfOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Profissional</DialogTitle></DialogHeader>
          {editingProfessional && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editingProfessional.name} onChange={(e) => setEditingProfessional({ ...editingProfessional, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Início Expediente</Label>
                  <Input type="time" value={editingProfessional.start_time || "08:00"} onChange={(e) => setEditingProfessional({ ...editingProfessional, start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Fim Expediente</Label>
                  <Input type="time" value={editingProfessional.end_time || "18:00"} onChange={(e) => setEditingProfessional({ ...editingProfessional, end_time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Serviços ({editProfServiceIds.length} selecionados)</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {allServices?.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`edit-s-${service.id}`} 
                        checked={editProfServiceIds.includes(service.id)} 
                        onCheckedChange={(checked) => setEditProfServiceIds(checked ? [...editProfServiceIds, service.id] : editProfServiceIds.filter(id => id !== service.id))} 
                      />
                      <label htmlFor={`edit-s-${service.id}`} className="text-sm flex-1">{service.name}</label>
                      {!service.is_available && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm">Status</Label>
                  <p className="text-xs text-muted-foreground">{editingProfessional.is_active ? "Ativo" : "Inativo"}</p>
                </div>
                <Switch 
                  checked={editingProfessional.is_active} 
                  onCheckedChange={(checked) => setEditingProfessional({ ...editingProfessional, is_active: checked })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditProfOpen(false)}>Cancelar</Button>
                <Button 
                  className="gradient-primary" 
                  onClick={() => updateProfessional.mutate({ 
                    id: editingProfessional.id, 
                    name: editingProfessional.name, 
                    serviceIds: editProfServiceIds,
                    startTime: editingProfessional.start_time || "08:00",
                    endTime: editingProfessional.end_time || "18:00"
                  })}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Day Modal */}
      <DetailModal isOpen={isDaySheetOpen} onClose={() => setIsDaySheetOpen(false)} title={selectedDay ? `Agendamentos - ${format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}` : "Agendamentos"}>
        <div className="space-y-3">
          {selectedDay && getAppointmentsForDay(selectedDay).length > 0 ? (
            getAppointmentsForDay(selectedDay).map((apt) => (
              <div key={apt.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => { setIsDaySheetOpen(false); openEditAppointment(apt); }}>
                <div className="flex items-center gap-3">
                  <StatusIndicator status={apt.status as AppointmentStatus} size="md" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{apt.patientName || "Paciente"}</p>
                    <p className="text-xs text-muted-foreground">{extractTimeFromISO(apt.scheduled_at)} - {apt.serviceName}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <StatusSelect value={apt.status as AppointmentStatus} onValueChange={(status) => updateAppointmentStatus.mutate({ id: apt.id, status })} size="sm" />
                  </div>
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
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={appointmentDate} onChange={(e) => { setAppointmentDate(e.target.value); setAppointmentTime(""); }} />
              </div>
              <div className="space-y-2">
                <Label>Hora * {availableSlots.length > 0 && <span className="text-muted-foreground font-normal">({availableSlots.length} disponíveis)</span>}</Label>
                <Select value={appointmentTime} onValueChange={setAppointmentTime} disabled={!selectedProfId || !appointmentDate}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        {!selectedProfId ? "Selecione um profissional" : !appointmentDate ? "Selecione uma data" : "Sem horários disponíveis"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={appointmentNotes} onChange={(e) => setAppointmentNotes(e.target.value)} /></div>
            <Button onClick={handleCreateAppointment} className="w-full gradient-primary" disabled={createAppointment.isPending}>
              {createAppointment.isPending ? "Criando..." : "Criar Agendamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditAppointmentOpen} onOpenChange={setIsEditAppointmentOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Agendamento</DialogTitle></DialogHeader>
          {editingAppointment && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground">Paciente</Label>
                <p className="font-medium">{editingAppointment.patientName || "Paciente"}</p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <StatusSelect 
                  value={editingAppointment.status as AppointmentStatus} 
                  onValueChange={(status) => {
                    setEditingAppointment({ ...editingAppointment, status });
                    updateAppointmentStatus.mutate({ id: editingAppointment.id, status });
                  }} 
                />
              </div>
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={editingAppointment.service_id} onValueChange={(v) => setEditingAppointment({ ...editingAppointment, service_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allServices?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={editingAppointment.professional_id} onValueChange={(v) => setEditingAppointment({ ...editingAppointment, professional_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allProfessionals?.filter(p => p.is_active).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={editingAppointment.date} onChange={(e) => setEditingAppointment({ ...editingAppointment, date: e.target.value, time: "" })} />
                </div>
                <div className="space-y-2">
                  <Label>Hora {editAvailableSlots.length > 0 && <span className="text-muted-foreground font-normal">({editAvailableSlots.length} disponíveis)</span>}</Label>
                  <Select value={editingAppointment.time} onValueChange={(v) => setEditingAppointment({ ...editingAppointment, time: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {editAvailableSlots.length > 0 ? (
                        editAvailableSlots.map((slot) => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">Sem horários disponíveis</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={editingAppointment.notes || ""} onChange={(e) => setEditingAppointment({ ...editingAppointment, notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditAppointmentOpen(false)}>Cancelar</Button>
                <Button className="gradient-primary" onClick={handleUpdateAppointment} disabled={updateAppointment.isPending}>
                  {updateAppointment.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
