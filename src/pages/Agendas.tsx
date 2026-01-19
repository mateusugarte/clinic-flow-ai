import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Clock,
  Phone,
  X,
  Edit,
  Search,
  Check,
  Power,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailModal, StatusIndicator } from "@/components/ui/detail-modal";
import { GlassCalendar } from "@/components/ui/glass-calendar";

type AppointmentStatus = "pendente" | "confirmado" | "risco" | "cancelado" | "atendido";

const statusLabels: Record<AppointmentStatus, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  risco: "Risco",
  cancelado: "Cancelado",
  atendido: "Atendido",
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
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  
  // New appointment form
  const [appointmentTab, setAppointmentTab] = useState<"existing" | "new">("existing");
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProfId, setSelectedProfId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  
  // New lead form
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");

  // Edit appointment form
  const [editAppointmentData, setEditAppointmentData] = useState<any>(null);

  // Fetch all professionals (including inactive for management)
  const { data: allProfessionals } = useQuery({
    queryKey: ["all-professionals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Active professionals only for dropdown
  const professionals = allProfessionals?.filter(p => p.is_active);

  // Toggle professional active status
  const toggleProfessionalActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("professionals")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-professionals"] });
      toast({ title: "Status do profissional atualizado!" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao atualizar status" });
    },
  });

  // Fetch services
  const { data: services } = useQuery({
    queryKey: ["services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_available", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch leads
  const { data: leads } = useQuery({
    queryKey: ["leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch appointments for selected professional
  const { data: appointments } = useQuery({
    queryKey: ["appointments", user?.id, selectedProfessional, currentDate],
    queryFn: async () => {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      let query = supabase
        .from("appointments")
        .select("*, leads(name, phone)")
        .eq("user_id", user!.id)
        .gte("scheduled_at", startOfMonth.toISOString())
        .lte("scheduled_at", endOfMonth.toISOString());
      
      if (selectedProfessional && selectedProfessional !== "all") {
        query = query.eq("professional_id", selectedProfessional);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create professional mutation
  const createProfessional = useMutation({
    mutationFn: async ({ name, serviceIds }: { name: string; serviceIds: string[] }) => {
      const { error } = await supabase.from("professionals").insert({
        name,
        user_id: user!.id,
        service_ids: serviceIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      setNewProfName("");
      setNewProfServiceIds([]);
      setIsNewProfOpen(false);
      toast({ title: "Profissional criado com sucesso!" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao criar profissional" });
    },
  });

  // Update professional mutation
  const updateProfessional = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("professionals")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      setIsEditProfOpen(false);
      setEditingProfessional(null);
      toast({ title: "Profissional atualizado!" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao atualizar profissional" });
    },
  });

  // Create lead mutation
  const createLead = useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name,
          phone,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  // Create appointment mutation
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
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao criar agendamento" });
    },
  });

  // Update appointment mutation
  const updateAppointment = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("appointments")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsEditAppointmentOpen(false);
      setEditAppointmentData(null);
      toast({ title: "Agendamento atualizado!" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao atualizar agendamento" });
    },
  });

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getAppointmentsForDay = (day: number) => {
    if (!appointments) return [];
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduled_at);
      return aptDate.getDate() === day;
    });
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setIsDaySheetOpen(true);
  };

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsAppointmentSheetOpen(true);
  };

  const handleEditProfessional = (prof: any) => {
    setEditingProfessional({
      ...prof,
      service_ids: prof.service_ids || [],
    });
    setIsEditProfOpen(true);
  };

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

  const handleCreateAppointment = async () => {
    let leadId = selectedLead?.id;
    
    if (appointmentTab === "new") {
      if (!newLeadName || !newLeadPhone) {
        toast({ variant: "destructive", title: "Preencha nome e telefone do lead" });
        return;
      }
      const newLead = await createLead.mutateAsync({ name: newLeadName, phone: newLeadPhone });
      leadId = newLead.id;
    }

    if (!leadId || !selectedServiceId || !selectedProfId || !appointmentDate || !appointmentTime) {
      toast({ variant: "destructive", title: "Preencha todos os campos obrigatórios" });
      return;
    }

    const service = services?.find(s => s.id === selectedServiceId);
    const professional = professionals?.find(p => p.id === selectedProfId);
    const lead = appointmentTab === "existing" ? selectedLead : { name: newLeadName, phone: newLeadPhone };

    const scheduledAt = new Date(`${appointmentDate}T${appointmentTime}`);

    createAppointment.mutate({
      user_id: user!.id,
      lead_id: leadId,
      service_id: selectedServiceId,
      professional_id: selectedProfId,
      scheduled_at: scheduledAt.toISOString(),
      serviceName: service?.name,
      professionalName: professional?.name,
      patientName: lead?.name,
      phoneNumber: parseInt(lead?.phone?.replace(/\D/g, "") || "0"),
      duracao: service?.duration,
      price: service?.price,
      notes: appointmentNotes,
      status: "pendente",
    });
  };

  const handleEditAppointment = (appointment: any) => {
    const scheduledDate = new Date(appointment.scheduled_at);
    setEditAppointmentData({
      ...appointment,
      date: format(scheduledDate, "yyyy-MM-dd"),
      time: format(scheduledDate, "HH:mm"),
    });
    setIsEditAppointmentOpen(true);
  };

  const handleSaveEditAppointment = () => {
    if (!editAppointmentData) return;

    const scheduledAt = new Date(`${editAppointmentData.date}T${editAppointmentData.time}`);
    const service = services?.find(s => s.id === editAppointmentData.service_id);
    const professional = professionals?.find(p => p.id === editAppointmentData.professional_id);

    updateAppointment.mutate({
      id: editAppointmentData.id,
      data: {
        service_id: editAppointmentData.service_id,
        professional_id: editAppointmentData.professional_id,
        scheduled_at: scheduledAt.toISOString(),
        serviceName: service?.name || editAppointmentData.serviceName,
        professionalName: professional?.name || editAppointmentData.professionalName,
        patientName: editAppointmentData.patientName,
        notes: editAppointmentData.notes,
        status: editAppointmentData.status,
        duracao: service?.duration || editAppointmentData.duracao,
        price: service?.price || editAppointmentData.price,
      },
    });
  };

  const filteredLeads = leads?.filter(lead => 
    lead.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
    lead.phone.includes(leadSearch)
  ) || [];

  const professionalsForService = selectedServiceId
    ? professionals?.filter(p => p.service_ids?.includes(selectedServiceId)) || []
    : [];

  // Calculate appointments count per day for GlassCalendar
  const appointmentsByDate = appointments?.reduce((acc, apt) => {
    const dateKey = format(new Date(apt.scheduled_at), "yyyy-MM-dd");
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const handleGlassCalendarDateSelect = (date: Date) => {
    setCurrentDate(date);
    const day = date.getDate();
    setSelectedDay(day);
    setIsDaySheetOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agendas</h1>
          <p className="text-muted-foreground">Visualize e gerencie agendamentos</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {professionals?.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  {prof.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isNewProfOpen} onOpenChange={setIsNewProfOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Novo Profissional
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Profissional</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={newProfName}
                    onChange={(e) => setNewProfName(e.target.value)}
                    placeholder="Nome do profissional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serviços que realiza</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {services?.map((service) => (
                      <div key={service.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={newProfServiceIds.includes(service.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewProfServiceIds([...newProfServiceIds, service.id]);
                            } else {
                              setNewProfServiceIds(newProfServiceIds.filter(id => id !== service.id));
                            }
                          }}
                        />
                        <label htmlFor={`service-${service.id}`} className="text-sm">
                          {service.name}
                        </label>
                      </div>
                    ))}
                    {!services?.length && (
                      <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => createProfessional.mutate({ name: newProfName, serviceIds: newProfServiceIds })}
                  disabled={!newProfName || createProfessional.isPending}
                  className="w-full gradient-primary"
                >
                  Criar Profissional
                </Button>
              </div>

              {/* Professionals List with Toggle */}
              <div className="border-t pt-4 mt-4">
                <Label className="text-muted-foreground text-xs mb-2 block">Gerenciar Profissionais</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allProfessionals?.map((prof) => (
                    <div key={prof.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className={prof.is_active ? "" : "text-muted-foreground line-through"}>
                          {prof.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {prof.is_active ? "Ativo" : "Inativo"}
                        </span>
                        <Switch
                          checked={prof.is_active}
                          onCheckedChange={(checked) => toggleProfessionalActive.mutate({ id: prof.id, is_active: checked })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setIsNewAppointmentOpen(true)} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Glass Calendar */}
      <GlassCalendar
        selectedDate={currentDate}
        onDateSelect={handleGlassCalendarDateSelect}
        appointmentsByDate={appointmentsByDate}
        onNewAppointment={() => setIsNewAppointmentOpen(true)}
      />

      {/* Calendar */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before first of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 p-2 bg-muted/30 rounded-lg" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayAppointments = getAppointmentsForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getFullYear() === currentDate.getFullYear();

              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-24 p-2 rounded-lg border transition-colors cursor-pointer ${
                    isToday ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAppointmentClick(apt);
                        }}
                        className="text-xs p-1 rounded bg-primary/10 text-primary truncate hover:bg-primary/20"
                      >
                        {format(new Date(apt.scheduled_at), "HH:mm")} - {apt.patientName || "Paciente"}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayAppointments.length - 2} mais
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Modal */}
      <DetailModal
        isOpen={isDaySheetOpen}
        onClose={() => setIsDaySheetOpen(false)}
        title={selectedDay ? `Agendamentos do dia ${format(
          new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay),
          "dd 'de' MMMM",
          { locale: ptBR }
        )}` : "Agendamentos"}
      >
        <div className="space-y-3">
          {selectedDay && getAppointmentsForDay(selectedDay).length > 0 ? (
            getAppointmentsForDay(selectedDay).map((apt) => (
              <div
                key={apt.id}
                onClick={() => handleAppointmentClick(apt)}
                className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusIndicator status={apt.status as AppointmentStatus} size="md" />
                  <div className="flex-1">
                    <p className="font-medium">{apt.patientName || "Paciente"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(apt.scheduled_at), "HH:mm")} - {apt.serviceName || "Serviço"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {statusLabels[apt.status as AppointmentStatus] || "Pendente"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum agendamento neste dia
            </p>
          )}
        </div>
      </DetailModal>

      {/* Appointment Details Modal */}
      <DetailModal
        isOpen={isAppointmentSheetOpen}
        onClose={() => setIsAppointmentSheetOpen(false)}
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
                <p>{selectedAppointment.phoneNumber || selectedAppointment.leads?.phone || "Não informado"}</p>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Confirmação Enviada</Label>
                <p>{selectedAppointment.confirmacaoEnviada ? "Sim" : "Não"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Risco de No-Show</Label>
                <p>{selectedAppointment.no_show_risk ? "Sim" : "Não"}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Criado em</Label>
              <p>{format(new Date(selectedAppointment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>

            <Button
              onClick={() => {
                setIsAppointmentSheetOpen(false);
                handleEditAppointment(selectedAppointment);
              }}
              className="w-full"
              variant="outline"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Agendamento
            </Button>
          </div>
        )}
      </DetailModal>

      {/* New Appointment Dialog */}
      <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <Tabs value={appointmentTab} onValueChange={(v) => setAppointmentTab(v as "existing" | "new")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Lead Existente</TabsTrigger>
              <TabsTrigger value="new">Novo Lead</TabsTrigger>
            </TabsList>
            
            <TabsContent value="existing" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Buscar Lead</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Buscar por nome ou telefone..."
                    className="pl-10"
                  />
                </div>
                {leadSearch && (
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {filteredLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => {
                          setSelectedLead(lead);
                          setLeadSearch("");
                        }}
                        className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-sm text-muted-foreground">{lead.phone}</p>
                        </div>
                        {selectedLead?.id === lead.id && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    ))}
                    {filteredLeads.length === 0 && (
                      <p className="p-3 text-sm text-muted-foreground">Nenhum lead encontrado</p>
                    )}
                  </div>
                )}
                {selectedLead && (
                  <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedLead.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedLead.phone}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedLead(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="Nome do paciente"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  placeholder="11999999999"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Serviço</Label>
              <Select value={selectedServiceId} onValueChange={(v) => {
                setSelectedServiceId(v);
                setSelectedProfId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - R$ {service.price} ({service.duration}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={selectedProfId} onValueChange={setSelectedProfId} disabled={!selectedServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedServiceId ? "Selecione o profissional" : "Selecione o serviço primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {professionalsForService.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.name}
                    </SelectItem>
                  ))}
                  {selectedServiceId && professionalsForService.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">
                      Nenhum profissional para este serviço
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={appointmentNotes}
                onChange={(e) => setAppointmentNotes(e.target.value)}
                placeholder="Observações do agendamento..."
              />
            </div>

            <Button
              onClick={handleCreateAppointment}
              disabled={createAppointment.isPending}
              className="w-full gradient-primary"
            >
              Criar Agendamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditAppointmentOpen} onOpenChange={setIsEditAppointmentOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          {editAppointmentData && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Paciente</Label>
                <Input
                  value={editAppointmentData.patientName || ""}
                  onChange={(e) => setEditAppointmentData({ ...editAppointmentData, patientName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editAppointmentData.status}
                  onValueChange={(v) => setEditAppointmentData({ ...editAppointmentData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select
                  value={editAppointmentData.service_id}
                  onValueChange={(v) => setEditAppointmentData({ ...editAppointmentData, service_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select
                  value={editAppointmentData.professional_id}
                  onValueChange={(v) => setEditAppointmentData({ ...editAppointmentData, professional_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals?.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={editAppointmentData.date}
                    onChange={(e) => setEditAppointmentData({ ...editAppointmentData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={editAppointmentData.time}
                    onChange={(e) => setEditAppointmentData({ ...editAppointmentData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={editAppointmentData.notes || ""}
                  onChange={(e) => setEditAppointmentData({ ...editAppointmentData, notes: e.target.value })}
                />
              </div>

              <Button
                onClick={handleSaveEditAppointment}
                disabled={updateAppointment.isPending}
                className="w-full gradient-primary"
              >
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Professional Dialog */}
      <Dialog open={isEditProfOpen} onOpenChange={setIsEditProfOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
          </DialogHeader>
          {editingProfessional && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingProfessional.name}
                  onChange={(e) => setEditingProfessional({ ...editingProfessional, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Serviços que realiza</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {services?.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-service-${service.id}`}
                        checked={editingProfessional.service_ids?.includes(service.id)}
                        onCheckedChange={(checked) => {
                          const newIds = checked
                            ? [...(editingProfessional.service_ids || []), service.id]
                            : editingProfessional.service_ids?.filter((id: string) => id !== service.id) || [];
                          setEditingProfessional({ ...editingProfessional, service_ids: newIds });
                        }}
                      />
                      <label htmlFor={`edit-service-${service.id}`} className="text-sm">
                        {service.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={editingProfessional.start_time}
                    onChange={(e) => setEditingProfessional({ ...editingProfessional, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input
                    type="time"
                    value={editingProfessional.end_time}
                    onChange={(e) => setEditingProfessional({ ...editingProfessional, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Intervalo (min)</Label>
                <Input
                  type="number"
                  value={editingProfessional.interval_min || 30}
                  onChange={(e) => setEditingProfessional({ ...editingProfessional, interval_min: parseInt(e.target.value) })}
                />
              </div>
              <Button
                onClick={() => updateProfessional.mutate({
                  id: editingProfessional.id,
                  data: {
                    name: editingProfessional.name,
                    service_ids: editingProfessional.service_ids,
                    start_time: editingProfessional.start_time,
                    end_time: editingProfessional.end_time,
                    interval_min: editingProfessional.interval_min,
                  },
                })}
                disabled={updateProfessional.isPending}
                className="w-full gradient-primary"
              >
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Professionals List for Editing */}
      {professionals && professionals.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Profissionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {professionals.map((prof) => (
                <div
                  key={prof.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{prof.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {prof.start_time} - {prof.end_time}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditProfessional(prof)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
