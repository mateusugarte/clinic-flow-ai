import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar, CheckCircle, XCircle, Send, ChevronLeft, ChevronRight, Clock, User, Phone, Briefcase, DollarSign, Loader2, AlertTriangle, HourglassIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfWeek, endOfWeek, addDays, isToday, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatISOToDisplay, extractDateTimeFromISO } from "@/lib/dateUtils";
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

interface SendProgress {
  total: number;
  sent: number;
  errors: number;
  currentPhone?: string;
  messages: { phone: string; success: boolean; message: string }[];
}

export default function NutricaoConfirmacao() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null);
  const [sentAppointmentIds, setSentAppointmentIds] = useState<Set<string>>(new Set());

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

  const selectedKey = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);
  const weekStartKey = useMemo(() => format(weekStart, "yyyy-MM-dd"), [weekStart]);
  const weekEndKey = useMemo(() => format(weekEnd, "yyyy-MM-dd"), [weekEnd]);

  const inWeek = (dateKey: string) => dateKey >= weekStartKey && dateKey <= weekEndKey;

  // Filter appointments using string extraction (no timezone conversion)
  const selectedDayConfirmed = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === selectedKey && apt.status === "confirmado";
    }), [appointments, selectedKey]);

  const weekConfirmed = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return inWeek(date) && apt.status === "confirmado";
    }), [appointments, weekStartKey, weekEndKey]);

  const selectedDayCancelled = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === selectedKey && apt.status === "cancelado";
    }), [appointments, selectedKey]);

  const weekCancelled = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return inWeek(date) && apt.status === "cancelado";
    }), [appointments, weekStartKey, weekEndKey]);

  const selectedDayPending = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === selectedKey && apt.status === "pendente";
    }), [appointments, selectedKey]);

  const weekPending = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return inWeek(date) && apt.status === "pendente";
    }), [appointments, weekStartKey, weekEndKey]);

  const selectedDayRisk = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === selectedKey && apt.status === "risco";
    }), [appointments, selectedKey]);

  const weekRisk = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return inWeek(date) && apt.status === "risco";
    }), [appointments, weekStartKey, weekEndKey]);

  // Get all appointments for selected date in calendar
  const selectedDateAppointments = useMemo(() =>
    appointments.filter((apt) => extractDateTimeFromISO(apt.scheduled_at).date === selectedKey),
    [appointments, selectedKey]
  );

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
      const dateKey = extractDateTimeFromISO(apt.scheduled_at).date;
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

  // Process streamed text response
  const processStreamedResponse = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>, decoder: TextDecoder, total: number) => {
    let buffer = "";
    const sentIds = new Set<string>();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          // Try to parse as JSON first
          const data = JSON.parse(line);
          const phone = data.phone || data.destinatario || data.recipient;
          const success = data.success !== false && !data.error;
          const message = data.message || data.error || (success ? "Enviado" : "Erro");
          
          if (phone) {
            setSendProgress(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                sent: prev.sent + (success ? 1 : 0),
                errors: prev.errors + (success ? 0 : 1),
                currentPhone: phone,
                messages: [...prev.messages, { phone, success, message }],
              };
            });

            // Find and mark the appointment as sent if successful
            if (success) {
              const apt = appointments.find(a => 
                (a.phoneNumber?.toString() === phone || a.lead?.phone === phone)
              );
              if (apt) {
                sentIds.add(apt.id);
                setSentAppointmentIds(prev => new Set([...prev, apt.id]));
              }
            }
          }
        } catch {
          // If not JSON, try to parse as text
          const phoneMatch = line.match(/(\d{10,})/);
          const isError = /erro|error|falha|fail/i.test(line);
          
          if (phoneMatch) {
            const phone = phoneMatch[1];
            setSendProgress(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                sent: prev.sent + (isError ? 0 : 1),
                errors: prev.errors + (isError ? 1 : 0),
                currentPhone: phone,
                messages: [...prev.messages, { phone, success: !isError, message: line }],
              };
            });
          }
        }
      }
    }
    
    return sentIds;
  }, [appointments]);

  // Send confirmation webhook - ONE BY ONE for real-time progress
  const sendConfirmation = async () => {
    if (selectedAppointments.length === 0) {
      toast.error("Selecione pelo menos um agendamento");
      return;
    }

    const appointmentsToSend = appointments.filter(apt => 
      selectedAppointments.includes(apt.id)
    );

    setSendingConfirmation(true);
    setSendProgress({
      total: appointmentsToSend.length,
      sent: 0,
      errors: 0,
      messages: [],
    });
    setSentAppointmentIds(new Set());

    const successfulIds: string[] = [];
    let sentCount = 0;
    let errorCount = 0;

    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Process each appointment one by one
      for (const apt of appointmentsToSend) {
        const phone = apt.phoneNumber?.toString() || apt.lead?.phone || "N/A";
        
        // Update current phone being processed
        setSendProgress(prev => prev ? {
          ...prev,
          currentPhone: phone,
        } : null);

        try {
          // Send minimal payload to edge function
          const payload = {
            appointmentId: apt.id,
            phone,
            patientName: apt.patientName || apt.lead?.name || "Paciente",
            scheduledAt: apt.scheduled_at,
            serviceName: apt.serviceName || "Consulta",
          };

          const response = await fetch(
            "https://qdsvbhtaldyjtfmujmyt.supabase.co/functions/v1/confirmation-proxy",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify(payload),
            }
          );

          const responseText = await response.text();
          
          if (response.ok) {
            // Success
            sentCount++;
            successfulIds.push(apt.id);
            setSentAppointmentIds(prev => new Set([...prev, apt.id]));
            
            setSendProgress(prev => prev ? {
              ...prev,
              sent: sentCount,
              messages: [...prev.messages, { 
                phone, 
                success: true, 
                message: responseText || "Enviado com sucesso" 
              }],
            } : null);

            // Mark as sent in database immediately
            await supabase
              .from("appointments")
              .update({ confirmacaoEnviada: true })
              .eq("id", apt.id);
          } else {
            // Error from webhook
            errorCount++;
            setSendProgress(prev => prev ? {
              ...prev,
              errors: errorCount,
              messages: [...prev.messages, { 
                phone, 
                success: false, 
                message: responseText || `Erro ${response.status}` 
              }],
            } : null);
          }
        } catch (fetchError) {
          // Network or other error
          errorCount++;
          setSendProgress(prev => prev ? {
            ...prev,
            errors: errorCount,
            messages: [...prev.messages, { 
              phone, 
              success: false, 
              message: "Erro de conexão" 
            }],
          } : null);
        }

        // Small delay between requests to avoid overwhelming the webhook
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Final notification
      if (errorCount > 0) {
        toast.warning(`${sentCount} enviado(s), ${errorCount} erro(s)`);
      } else {
        toast.success(`Confirmação enviada para ${sentCount} agendamento(s)!`);
      }
      
      setSelectedAppointments([]);
      queryClient.invalidateQueries({ queryKey: ["appointments-confirmacao"] });
    } catch (error) {
      console.error("Error sending confirmation:", error);
      toast.error("Erro ao enviar confirmação");
    } finally {
      setSendingConfirmation(false);
      // Clear current phone
      setSendProgress(prev => prev ? { ...prev, currentPhone: undefined } : null);
      // Keep progress visible for a moment before clearing
      setTimeout(() => {
        setSendProgress(null);
        setSentAppointmentIds(new Set());
      }, 5000);
    }
  };

  const AppointmentCard = ({ appointment, showCheckbox = false }: { appointment: Appointment; showCheckbox?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors overflow-hidden"
    >
      <div className="flex items-start gap-2 min-w-0">
        {showCheckbox && !appointment.confirmacaoEnviada && (
          <Checkbox
            checked={selectedAppointments.includes(appointment.id)}
            onCheckedChange={() => toggleAppointmentSelection(appointment.id)}
            className="mt-1 flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate text-sm">
                {appointment.patientName || appointment.lead?.name || "Sem nome"}
              </span>
            </div>
            <div className="flex-shrink-0">
              <StatusSelect
                value={appointment.status || "pendente"}
                onValueChange={(status) => updateStatusMutation.mutate({ id: appointment.id, status })}
                size="sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{formatISOToDisplay(appointment.scheduled_at)}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {appointment.phoneNumber || appointment.lead?.phone || "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Briefcase className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{appointment.serviceName || "Serviço não especificado"}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <DollarSign className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">R$ {appointment.price?.toFixed(2) || "0,00"}</span>
            </div>
          </div>

          <div className="pt-1.5 grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-2xs text-muted-foreground flex-shrink-0">Profissional:</span>
              <Badge variant="outline" className="text-2xs min-w-0 max-w-full truncate">
                {appointment.professionalName || "Não atribuído"}
              </Badge>
            </div>

            {appointment.confirmacaoEnviada && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-2xs min-w-0 truncate sm:justify-self-end">
                <CheckCircle className="h-2.5 w-2.5 mr-1 flex-shrink-0" />
                <span className="truncate">Confirmação enviada</span>
              </Badge>
            )}
          </div>

          {appointment.notes && (
            <p className="text-2xs text-muted-foreground bg-muted/50 p-1.5 rounded mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard 
          title={`Pendentes ${format(selectedDate, "dd/MM", { locale: ptBR })}`}
          count={selectedDayPending.length} 
          icon={HourglassIcon} 
          color="bg-yellow-500/10 text-yellow-500" 
        />
        <StatCard 
          title="Pendentes Semana" 
          count={weekPending.length} 
          icon={HourglassIcon} 
          color="bg-yellow-500/10 text-yellow-500" 
        />
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
          title={`Risco ${format(selectedDate, "dd/MM", { locale: ptBR })}`}
          count={selectedDayRisk.length} 
          icon={AlertTriangle} 
          color="bg-orange-500/10 text-orange-500" 
        />
        <StatCard 
          title="Risco Semana" 
          count={weekRisk.length} 
          icon={AlertTriangle} 
          color="bg-orange-500/10 text-orange-500" 
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
          <CardContent className="flex-1 min-h-0 flex flex-col">
            <Tabs defaultValue="pendentes" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                <TabsTrigger value="pendentes" className="text-xs sm:text-sm px-1 sm:px-2">
                  <span className="truncate">Pendentes</span>
                  <span className="ml-1">({selectedDayPending.length})</span>
                </TabsTrigger>
                <TabsTrigger value="confirmados" className="text-xs sm:text-sm px-1 sm:px-2">
                  <span className="truncate">Confirmados</span>
                  <span className="ml-1">({selectedDayConfirmed.length})</span>
                </TabsTrigger>
                <TabsTrigger value="risco" className="text-xs sm:text-sm px-1 sm:px-2">
                  <span className="truncate">Risco</span>
                  <span className="ml-1">({selectedDayRisk.length})</span>
                </TabsTrigger>
                <TabsTrigger value="cancelados" className="text-xs sm:text-sm px-1 sm:px-2">
                  <span className="truncate">Cancelados</span>
                  <span className="ml-1">({selectedDayCancelled.length})</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pendentes" className="flex-1 min-h-0 mt-4 flex flex-col data-[state=inactive]:hidden">
                {/* Pending appointments with send confirmation button */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    {selectedDayPending.filter(apt => !apt.confirmacaoEnviada).length} pendente(s) sem confirmação enviada
                  </p>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const pendingNotSent = selectedDayPending.filter(apt => !apt.confirmacaoEnviada);
                        setSelectedAppointments(pendingNotSent.map(apt => apt.id));
                      }}
                      className="text-xs"
                    >
                      Selecionar todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs">
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[calc(100vh-520px)] min-h-[200px]">
                  <div className="space-y-3 pr-2">
                    {selectedDayPending.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum agendamento pendente nesta data
                      </p>
                    ) : (
                      selectedDayPending.map(apt => (
                        <AppointmentCard key={apt.id} appointment={apt} showCheckbox={!apt.confirmacaoEnviada} />
                      ))
                    )}
                  </div>
                </div>
                
                {/* Send button only in pendentes tab */}
                {selectedDayPending.length > 0 && (
                  <div className="pt-4 border-t mt-4 space-y-3">
                    {/* Progress Bar */}
                    {sendProgress && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3 p-4 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Progresso do envio</span>
                          <span className="text-muted-foreground">
                            {sendProgress.sent + sendProgress.errors} / {sendProgress.total}
                          </span>
                        </div>
                        
                        <Progress 
                          value={((sendProgress.sent + sendProgress.errors) / sendProgress.total) * 100} 
                          invisible
                        />
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1 text-emerald-500">
                              <CheckCircle className="h-3.5 w-3.5" />
                              {sendProgress.sent} enviado(s)
                            </span>
                            {sendProgress.errors > 0 && (
                              <span className="flex items-center gap-1 text-red-500">
                                <XCircle className="h-3.5 w-3.5" />
                                {sendProgress.errors} erro(s)
                              </span>
                            )}
                          </div>
                          {sendProgress.currentPhone && (
                            <span className="text-muted-foreground animate-pulse truncate max-w-[150px]">
                              Enviando: {sendProgress.currentPhone}
                            </span>
                          )}
                        </div>

                        {/* Recent Messages */}
                        {sendProgress.messages.length > 0 && (
                          <ScrollArea className="h-20 mt-2">
                            <div className="space-y-1">
                              {sendProgress.messages.slice(-5).map((msg, idx) => (
                                <div 
                                  key={idx} 
                                  className={cn(
                                    "text-xs px-2 py-1 rounded flex items-center gap-2",
                                    msg.success ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                                  )}
                                >
                                  {msg.success ? <CheckCircle className="h-3 w-3 flex-shrink-0" /> : <XCircle className="h-3 w-3 flex-shrink-0" />}
                                  <span className="font-mono flex-shrink-0">{msg.phone}</span>
                                  <span className="truncate">{msg.message}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </motion.div>
                    )}

                    <Button 
                      onClick={sendConfirmation}
                      disabled={sendingConfirmation || selectedAppointments.length === 0}
                      className="w-full gap-2 h-12"
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
                          Enviar Confirmação ({selectedAppointments.length})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="confirmados" className="flex-1 min-h-0 mt-4 data-[state=inactive]:hidden">
                <div className="overflow-y-auto max-h-[calc(100vh-420px)] min-h-[200px]">
                  <div className="space-y-3 pr-2">
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
                </div>
              </TabsContent>
              <TabsContent value="risco" className="flex-1 min-h-0 mt-4 data-[state=inactive]:hidden">
                <div className="overflow-y-auto max-h-[calc(100vh-420px)] min-h-[200px]">
                  <div className="space-y-3 pr-2">
                    {selectedDayRisk.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum agendamento com risco nesta data
                      </p>
                    ) : (
                      selectedDayRisk.map(apt => (
                        <AppointmentCard key={apt.id} appointment={apt} />
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="cancelados" className="flex-1 min-h-0 mt-4 data-[state=inactive]:hidden">
                <div className="overflow-y-auto max-h-[calc(100vh-420px)] min-h-[200px]">
                  <div className="space-y-3 pr-2">
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
                </div>
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

            {/* Selected Date Appointments - Only pending - LARGER AREA */}
            <div className="flex-1 min-h-0 flex flex-col border-t pt-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-medium truncate">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {pendingConfirmationAppointments.length} agendamento(s) aguardando confirmação
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={selectAllForDate} className="whitespace-nowrap">
                    Selecionar todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="whitespace-nowrap">
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

              {/* Send Confirmation Button and Progress */}
              <div className="pt-4 border-t mt-4 space-y-4">
                {/* Progress Bar */}
                {sendProgress && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 p-4 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Progresso do envio</span>
                      <span className="text-muted-foreground">
                        {sendProgress.sent + sendProgress.errors} / {sendProgress.total}
                      </span>
                    </div>
                    
                    <Progress 
                      value={((sendProgress.sent + sendProgress.errors) / sendProgress.total) * 100} 
                      invisible
                    />
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {sendProgress.sent} enviado(s)
                        </span>
                        {sendProgress.errors > 0 && (
                          <span className="flex items-center gap-1 text-red-500">
                            <XCircle className="h-3.5 w-3.5" />
                            {sendProgress.errors} erro(s)
                          </span>
                        )}
                      </div>
                      {sendProgress.currentPhone && (
                        <span className="text-muted-foreground animate-pulse">
                          Enviando: {sendProgress.currentPhone}
                        </span>
                      )}
                    </div>

                    {/* Recent Messages */}
                    {sendProgress.messages.length > 0 && (
                      <ScrollArea className="h-24 mt-2">
                        <div className="space-y-1">
                          {sendProgress.messages.slice(-5).map((msg, idx) => (
                            <div 
                              key={idx} 
                              className={cn(
                                "text-xs px-2 py-1 rounded flex items-center gap-2",
                                msg.success ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                              )}
                            >
                              {msg.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              <span className="font-mono">{msg.phone}</span>
                              <span className="truncate">{msg.message}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </motion.div>
                )}

                <Button 
                  onClick={sendConfirmation}
                  disabled={sendingConfirmation || selectedAppointments.length === 0}
                  className="w-full gap-2 h-14 text-base font-semibold"
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
                  <p className="text-sm text-center text-primary font-medium">
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
