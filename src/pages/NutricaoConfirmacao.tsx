import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle, XCircle, Send, ChevronLeft, ChevronRight, Clock, User, Phone, Briefcase, DollarSign, Edit2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfDay, endOfDay, isToday, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatISOToDisplay, extractTimeFromISO } from "@/lib/dateUtils";
import { StatusSelect } from "@/components/ui/status-select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type AppointmentStatus = "pendente" | "confirmado" | "risco" | "cancelado" | "atendido";

interface Appointment {
  id: string;
  lead_id: string;
  professional_id: string;
  service_id: string;
  scheduled_at: string;
  status: AppointmentStatus | null;
  notes: string | null;
  patientName: string | null;
  phoneNumber: number | null;
  professionalName: string | null;
  serviceName: string | null;
  price: number | null;
  duracao: number | null;
  confirmacaoEnviada: boolean | null;
  created_at: string | null;
  no_show_risk: boolean | null;
  user_id: string;
  lead?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    notes: string | null;
    tags: string[] | null;
    qualification: string | null;
    last_interaction: string | null;
    created_at: string | null;
  };
}

export default function NutricaoConfirmacao() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [sendingConfirmation, setSendingConfirmation] = useState(false);

  // Fetch appointments with leads
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments-confirmacao", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          lead:leads(*)
        `)
        .eq("user_id", user.id)
        .order("scheduled_at", { ascending: true });
      
      if (error) throw error;
      return (data || []) as Appointment[];
    },
    enabled: !!user?.id,
  });

  // Update appointment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-confirmacao"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Mark confirmation as sent mutation
  const markConfirmationSentMutation = useMutation({
    mutationFn: async (appointmentIds: string[]) => {
      const { error } = await supabase
        .from("appointments")
        .update({ confirmacaoEnviada: true })
        .in("id", appointmentIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-confirmacao"] });
    },
  });

  // Get today and week boundaries
  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const weekEnd = useMemo(() => endOfWeek(today, { weekStartsOn: 1 }), [today]);

  // Filter appointments - using selectedDate for daily view
  const selectedDayConfirmed = useMemo(() => 
    appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at);
      return isSameDay(aptDate, selectedDate) && apt.status === "confirmado";
    }), [appointments, selectedDate]);

  const weekConfirmed = useMemo(() => 
    appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at);
      return aptDate >= weekStart && aptDate <= weekEnd && apt.status === "confirmado";
    }), [appointments, weekStart, weekEnd]);

  const selectedDayCancelled = useMemo(() => 
    appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at);
      return isSameDay(aptDate, selectedDate) && apt.status === "cancelado";
    }), [appointments, selectedDate]);

  const weekCancelled = useMemo(() => 
    appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at);
      return aptDate >= weekStart && aptDate <= weekEnd && apt.status === "cancelado";
    }), [appointments, weekStart, weekEnd]);

  // Get all appointments for selected date in calendar
  const selectedDateAppointments = useMemo(() => 
    appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at);
      return isSameDay(aptDate, selectedDate);
    }), [appointments, selectedDate]);

  // Only appointments that haven't been sent confirmation yet
  const pendingConfirmationAppointments = useMemo(() => 
    selectedDateAppointments.filter(apt => !apt.confirmacaoEnviada), 
    [selectedDateAppointments]);

  // Get calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarMonth]);

  // Get appointment counts by day
  const appointmentsByDay = useMemo(() => {
    const byDay: Record<string, { total: number; confirmed: number; pending: number }> = {};
    appointments.forEach(apt => {
      const dateKey = format(new Date(apt.scheduled_at), "yyyy-MM-dd");
      if (!byDay[dateKey]) {
        byDay[dateKey] = { total: 0, confirmed: 0, pending: 0 };
      }
      byDay[dateKey].total++;
      if (apt.confirmacaoEnviada) {
        byDay[dateKey].confirmed++;
      } else {
        byDay[dateKey].pending++;
      }
    });
    return byDay;
  }, [appointments]);

  // Check if date is the target date for sending confirmations (2 days ahead)
  const confirmationTargetDate = useMemo(() => addDays(today, 2), [today]);

  // Toggle appointment selection
  const toggleAppointmentSelection = (id: string) => {
    setSelectedAppointments(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Select all appointments for the selected date
  const selectAllForDate = () => {
    const notSentYet = selectedDateAppointments.filter(apt => !apt.confirmacaoEnviada);
    setSelectedAppointments(notSentYet.map(apt => apt.id));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedAppointments([]);
  };

  // Send confirmation webhook
  const sendConfirmation = async () => {
    if (selectedAppointments.length === 0) {
      toast.error("Selecione pelo menos um agendamento");
      return;
    }

    setSendingConfirmation(true);
    try {
      const appointmentsToSend = appointments.filter(apt => 
        selectedAppointments.includes(apt.id)
      );

      const payload = {
        user_id: user?.id,
        agendamentos: appointmentsToSend.map(apt => ({
          ...apt,
          lead: apt.lead || null,
        })),
      };

      const response = await fetch(
        "https://aula-n8n.riftvt.easypanel.host/webhook/3563be98-d85f-47b1-9eec-895f2a507258",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Falha ao enviar confirmação");
      }

      // Mark as sent in database
      await markConfirmationSentMutation.mutateAsync(selectedAppointments);

      toast.success(`Confirmação enviada para ${selectedAppointments.length} agendamento(s)!`);
      setSelectedAppointments([]);
    } catch (error) {
      console.error("Error sending confirmation:", error);
      toast.error("Erro ao enviar confirmação");
    } finally {
      setSendingConfirmation(false);
    }
  };

  const AppointmentCard = ({ appointment, showCheckbox = false }: { appointment: Appointment; showCheckbox?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        {showCheckbox && !appointment.confirmacaoEnviada && (
          <Checkbox
            checked={selectedAppointments.includes(appointment.id)}
            onCheckedChange={() => toggleAppointmentSelection(appointment.id)}
            className="mt-1"
          />
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{appointment.patientName || appointment.lead?.name || "Sem nome"}</span>
            </div>
            <StatusSelect
              value={appointment.status || "pendente"}
              onValueChange={(status) => updateStatusMutation.mutate({ id: appointment.id, status })}
              size="sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatISOToDisplay(appointment.scheduled_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              <span>{appointment.phoneNumber || appointment.lead?.phone || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5" />
              <span>{appointment.serviceName || "Serviço não especificado"}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" />
              <span>R$ {appointment.price?.toFixed(2) || "0,00"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Profissional:</span>
              <Badge variant="outline" className="text-xs">
                {appointment.professionalName || "Não atribuído"}
              </Badge>
            </div>
            {appointment.confirmacaoEnviada && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirmação enviada
              </Badge>
            )}
          </div>

          {appointment.notes && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-2">
              {appointment.notes}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );

  const StatCard = ({ title, count, icon: Icon, color }: { title: string; count: number; icon: any; color: string }) => (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{count}</p>
          </div>
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-auto">
      {/* Header Stats - Week always fixed */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title={`Confirmados ${format(selectedDate, "dd/MM", { locale: ptBR })}`}
          count={selectedDayConfirmed.length} 
          icon={CheckCircle} 
          color="bg-emerald-500/10 text-emerald-500" 
        />
        <StatCard 
          title="Confirmados Semana" 
          count={weekConfirmed.length} 
          icon={CheckCircle} 
          color="bg-emerald-500/10 text-emerald-500" 
        />
        <StatCard 
          title={`Cancelados ${format(selectedDate, "dd/MM", { locale: ptBR })}`}
          count={selectedDayCancelled.length} 
          icon={XCircle} 
          color="bg-red-500/10 text-red-500" 
        />
        <StatCard 
          title="Cancelados Semana" 
          count={weekCancelled.length} 
          icon={XCircle} 
          color="bg-red-500/10 text-red-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left Panel - Selected Day Appointments */}
        <Card className="shadow-card flex flex-col min-h-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendamentos - {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <Tabs defaultValue="confirmados" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="confirmados">
                  Confirmados ({selectedDayConfirmed.length})
                </TabsTrigger>
                <TabsTrigger value="cancelados">
                  Cancelados ({selectedDayCancelled.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="confirmados" className="flex-1 min-h-0 mt-0">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {selectedDayConfirmed.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum agendamento confirmado nesta data
                      </p>
                    ) : (
                      selectedDayConfirmed.map(apt => (
                        <AppointmentCard key={apt.id} appointment={apt} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="cancelados" className="flex-1 min-h-0 mt-0">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {selectedDayCancelled.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum agendamento cancelado nesta data
                      </p>
                    ) : (
                      selectedDayCancelled.map(apt => (
                        <AppointmentCard key={apt.id} appointment={apt} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Right Panel - Confirmation Calendar (Larger) */}
        <Card className="shadow-card flex flex-col min-h-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5" />
              Envio de Confirmações
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col">
            {/* Calendar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-base font-medium">
                  {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => (
                  <div key={day} className="text-muted-foreground font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map(day => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayData = appointmentsByDay[dateKey];
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, calendarMonth);
                  const isTargetDate = isSameDay(day, confirmationTargetDate);
                  
                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative p-2 text-sm rounded-lg transition-colors aspect-square flex flex-col items-center justify-center",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected && isToday(day) && "bg-accent",
                        !isSelected && !isToday(day) && "hover:bg-accent",
                        !isCurrentMonth && "text-muted-foreground/50",
                        isTargetDate && !isSelected && "ring-2 ring-primary ring-offset-2"
                      )}
                    >
                      <span>{format(day, "d")}</span>
                      {dayData && dayData.total > 0 && (
                        <div className="flex gap-1 mt-1">
                          {dayData.confirmed > 0 && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                          {dayData.pending > 0 && (
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Confirmação enviada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Pendente envio</span>
                </div>
              </div>
            </div>

            {/* Selected Date Appointments - Only pending */}
            <div className="flex-1 min-h-0 flex flex-col border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-medium">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {pendingConfirmationAppointments.length} agendamento(s) aguardando confirmação
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllForDate}>
                    Selecionar todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Limpar
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
                <div className="space-y-3 pr-2">
                  <AnimatePresence mode="wait">
                    {pendingConfirmationAppointments.length === 0 ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8"
                      >
                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <p className="text-muted-foreground">
                          Todas as confirmações já foram enviadas para esta data!
                        </p>
                      </motion.div>
                    ) : (
                      pendingConfirmationAppointments.map(apt => (
                        <AppointmentCard key={apt.id} appointment={apt} showCheckbox />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              {/* Send Confirmation Button */}
              <div className="pt-4 border-t mt-4">
                <Button 
                  onClick={sendConfirmation}
                  disabled={sendingConfirmation || selectedAppointments.length === 0}
                  className="w-full gap-2 h-12 text-base"
                  size="lg"
                >
                  {sendingConfirmation ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando confirmações...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Enviar Confirmação ({selectedAppointments.length} selecionado{selectedAppointments.length !== 1 ? 's' : ''})
                    </>
                  )}
                </Button>
                {isSameDay(selectedDate, confirmationTargetDate) && (
                  <p className="text-sm text-center text-primary mt-3 font-medium">
                    📅 Data recomendada para envio de confirmações
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
