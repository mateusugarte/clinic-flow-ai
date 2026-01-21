import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar, CheckCircle, XCircle, Send, ChevronLeft, ChevronRight, Clock, User, Phone, Briefcase, DollarSign, Loader2, AlertTriangle, HourglassIcon, Activity } from "lucide-react";
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

interface RiskProgress {
  total: number;
  calculated: number;
  errors: number;
  currentName?: string;
  results: { id: string; name: string; success: boolean; result: string }[];
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
  
  // Risk calculation states
  const [riskCalendarMonth, setRiskCalendarMonth] = useState(new Date());
  const [selectedRiskAppointments, setSelectedRiskAppointments] = useState<string[]>([]);
  const [calculatingRisk, setCalculatingRisk] = useState(false);
  const [riskProgress, setRiskProgress] = useState<RiskProgress | null>(null);

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

  // Get today
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => format(today, "yyyy-MM-dd"), [today]);
  const selectedKey = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

  // Filter appointments for today only (for metrics)
  const todayPending = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === todayKey && apt.status === "pendente";
    }), [appointments, todayKey]);

  const todayConfirmed = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === todayKey && apt.status === "confirmado";
    }), [appointments, todayKey]);

  const todayRisk = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === todayKey && apt.status === "risco";
    }), [appointments, todayKey]);

  const todayCancelled = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === todayKey && apt.status === "cancelado";
    }), [appointments, todayKey]);

  // Filter for selected day (tabs)
  const selectedDayConfirmed = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === selectedKey && apt.status === "confirmado";
    }), [appointments, selectedKey]);

  const selectedDayCancelled = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === selectedKey && apt.status === "cancelado";
    }), [appointments, selectedKey]);

  const selectedDayPending = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === selectedKey && apt.status === "pendente";
    }), [appointments, selectedKey]);

  const selectedDayRisk = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === selectedKey && apt.status === "risco";
    }), [appointments, selectedKey]);

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

  // Tomorrow's date for risk calculation
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const tomorrowKey = useMemo(() => format(tomorrow, "yyyy-MM-dd"), [tomorrow]);

  // Risk calendar days
  const riskCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(riskCalendarMonth);
    const monthEnd = endOfMonth(riskCalendarMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [riskCalendarMonth]);

  // Get appointments eligible for risk calculation (ONLY tomorrow's appointments with status = pendente)
  const riskEligibleAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      // Only appointments for tomorrow that haven't been calculated yet (status = pendente)
      return date === tomorrowKey && apt.status === "pendente";
    });
  }, [appointments, tomorrowKey]);

  // Get appointments that already had risk calculated (status !== pendente for tomorrow)
  const riskCalculatedAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      // Tomorrow's appointments with status different from pendente
      return date === tomorrowKey && apt.status !== "pendente";
    });
  }, [appointments, tomorrowKey]);

  // Calculate confirmation target date key (2 days ahead) - MOVED BEFORE EARLY RETURN
  const targetDateKey = useMemo(() => format(confirmationTargetDate, "yyyy-MM-dd"), [confirmationTargetDate]);
  
  // Appointments for target date (2 days ahead) that need confirmation
  const targetDateAppointments = useMemo(() =>
    appointments.filter((apt) => {
      const { date } = extractDateTimeFromISO(apt.scheduled_at);
      return date === targetDateKey;
    }), [appointments, targetDateKey]);
  
  const targetDateNotSent = useMemo(() => 
    targetDateAppointments.filter(apt => !apt.confirmacaoEnviada),
    [targetDateAppointments]
  );
  
  const allConfirmationsSent = useMemo(() => 
    targetDateAppointments.length > 0 && targetDateNotSent.length === 0,
    [targetDateAppointments, targetDateNotSent]
  );

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

  // Clear confirmation selection
  const clearSelection = () => {
    setSelectedAppointments([]);
  };

  // Toggle risk appointment selection
  const toggleRiskAppointmentSelection = (id: string) => {
    setSelectedRiskAppointments(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Select all risk-eligible appointments (only pendente ones)
  const selectAllRiskAppointments = () => {
    setSelectedRiskAppointments(riskEligibleAppointments.filter(apt => apt.status === "pendente").map(apt => apt.id));
  };

  // Clear risk selection
  const clearRiskSelection = () => {
    setSelectedRiskAppointments([]);
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

  // Calculate no-show risk via webhook - ONE BY ONE for real-time progress
  const calculateNoShowRisk = async () => {
    if (selectedRiskAppointments.length === 0) {
      toast.error("Selecione pelo menos um agendamento");
      return;
    }

    const appointmentsToCalculate = appointments.filter(apt => 
      selectedRiskAppointments.includes(apt.id)
    );

    setCalculatingRisk(true);
    setRiskProgress({
      total: appointmentsToCalculate.length,
      calculated: 0,
      errors: 0,
      results: [],
    });

    let calculatedCount = 0;
    let errorCount = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      for (const apt of appointmentsToCalculate) {
        const patientName = apt.patientName || apt.lead?.name || "Paciente";
        
        setRiskProgress(prev => prev ? {
          ...prev,
          currentName: patientName,
        } : null);

        try {
          const payload = {
            appointmentId: apt.id,
            patientName,
            phone: apt.phoneNumber?.toString() || apt.lead?.phone || "",
            scheduledAt: apt.scheduled_at,
            serviceName: apt.serviceName || "Consulta",
            professionalName: apt.professionalName || "",
            leadId: apt.lead_id,
            notes: apt.notes || apt.lead?.notes || "",
            tags: apt.lead?.tags || [],
            qualification: apt.lead?.qualification || "",
            lastInteraction: apt.lead?.last_interaction || "",
          };

          const response = await fetch(
            "https://qdsvbhtaldyjtfmujmyt.supabase.co/functions/v1/risk-proxy",
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
            calculatedCount++;
            setRiskProgress(prev => prev ? {
              ...prev,
              calculated: calculatedCount,
              results: [...prev.results, { 
                id: apt.id,
                name: patientName, 
                success: true, 
                result: responseText || "Calculado" 
              }],
            } : null);
          } else {
            errorCount++;
            setRiskProgress(prev => prev ? {
              ...prev,
              errors: errorCount,
              results: [...prev.results, { 
                id: apt.id,
                name: patientName, 
                success: false, 
                result: responseText || `Erro ${response.status}` 
              }],
            } : null);
          }
        } catch (fetchError) {
          errorCount++;
          setRiskProgress(prev => prev ? {
            ...prev,
            errors: errorCount,
            results: [...prev.results, { 
              id: apt.id,
              name: patientName, 
              success: false, 
              result: "Erro de conexão" 
            }],
          } : null);
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (errorCount > 0) {
        toast.warning(`${calculatedCount} calculado(s), ${errorCount} erro(s)`);
      } else {
        toast.success(`Risco calculado para ${calculatedCount} agendamento(s)!`);
      }
      
      setSelectedRiskAppointments([]);
    } catch (error) {
      console.error("Error calculating risk:", error);
      toast.error("Erro ao calcular risco");
    } finally {
      setCalculatingRisk(false);
      setRiskProgress(prev => prev ? { ...prev, currentName: undefined } : null);
      // Keep progress visible for longer to see results
      setTimeout(() => {
        setRiskProgress(null);
      }, 10000);
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
    <Card className="shadow-card border-0">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-none">{count}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{title}</p>
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
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* Top Section - Alert + Stats */}
      <div className="flex-shrink-0 space-y-4 mb-4">
        {/* Confirmation Alert Card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-3 rounded-lg border-2 flex items-center justify-between gap-4",
            allConfirmationsSent 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" 
              : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {allConfirmationsSent ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {allConfirmationsSent 
                  ? "Todas as confirmações foram enviadas!" 
                  : `${targetDateNotSent.length} confirmação(ões) pendente(s)`}
              </p>
              <p className="text-xs opacity-80 truncate">
                {allConfirmationsSent 
                  ? `Agendamentos de ${format(confirmationTargetDate, "dd/MM", { locale: ptBR })} estão confirmados`
                  : `Envie as confirmações para ${format(confirmationTargetDate, "dd/MM", { locale: ptBR })} (daqui 2 dias)`}
              </p>
            </div>
          </div>
          {!allConfirmationsSent && targetDateNotSent.length > 0 && (
            <Button 
              size="sm" 
              variant="outline"
              className="border-red-500/50 text-red-600 hover:bg-red-500/10 flex-shrink-0"
              onClick={() => {
                setSelectedDate(confirmationTargetDate);
                setSelectedAppointments(targetDateNotSent.map(apt => apt.id));
              }}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Enviar agora
            </Button>
          )}
        </motion.div>

        {/* Today's Stats - Compact row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            title="Pendentes Hoje"
            count={todayPending.length} 
            icon={HourglassIcon} 
            color="bg-yellow-500/10 text-yellow-500" 
          />
          <StatCard 
            title="Confirmados Hoje"
            count={todayConfirmed.length} 
            icon={CheckCircle} 
            color="bg-emerald-500/10 text-emerald-500" 
          />
          <StatCard 
            title="Risco Hoje"
            count={todayRisk.length} 
            icon={AlertTriangle} 
            color="bg-orange-500/10 text-orange-500" 
          />
          <StatCard 
            title="Cancelados Hoje"
            count={todayCancelled.length} 
            icon={XCircle} 
            color="bg-red-500/10 text-red-500" 
          />
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Panel - Selected Day Appointments */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Agendamentos - {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pendentes" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="pendentes" className="text-xs px-1">
                    Pend. ({selectedDayPending.length})
                  </TabsTrigger>
                  <TabsTrigger value="confirmados" className="text-xs px-1">
                    Conf. ({selectedDayConfirmed.length})
                  </TabsTrigger>
                  <TabsTrigger value="risco" className="text-xs px-1">
                    Risco ({selectedDayRisk.length})
                  </TabsTrigger>
                  <TabsTrigger value="cancelados" className="text-xs px-1">
                    Canc. ({selectedDayCancelled.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pendentes" className="mt-0">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <p className="text-xs text-muted-foreground">
                      {selectedDayPending.filter(apt => !apt.confirmacaoEnviada).length} sem confirmação
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const pendingNotSent = selectedDayPending.filter(apt => !apt.confirmacaoEnviada);
                          setSelectedAppointments(pendingNotSent.map(apt => apt.id));
                        }}
                        className="text-xs h-7"
                      >
                        Selecionar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs h-7">
                        Limpar
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-2 pr-2">
                      {selectedDayPending.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-sm">
                          Nenhum agendamento pendente
                        </p>
                      ) : (
                        selectedDayPending.map(apt => (
                          <AppointmentCard key={apt.id} appointment={apt} showCheckbox={!apt.confirmacaoEnviada} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  
                  {selectedDayPending.length > 0 && (
                    <div className="pt-3 border-t mt-3">
                      {sendProgress && (
                        <div className="mb-3 p-3 rounded-lg bg-muted/50 border space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">Progresso</span>
                            <span>{sendProgress.sent + sendProgress.errors} / {sendProgress.total}</span>
                          </div>
                          <Progress value={((sendProgress.sent + sendProgress.errors) / sendProgress.total) * 100} />
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-emerald-500">{sendProgress.sent} ok</span>
                            {sendProgress.errors > 0 && <span className="text-red-500">{sendProgress.errors} erro(s)</span>}
                          </div>
                        </div>
                      )}
                      <Button 
                        onClick={sendConfirmation}
                        disabled={sendingConfirmation || selectedAppointments.length === 0}
                        className="w-full gap-2 h-10"
                      >
                        {sendingConfirmation ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                        ) : (
                          <><Send className="h-4 w-4" /> Enviar ({selectedAppointments.length})</>
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="confirmados" className="mt-0">
                  <ScrollArea className="h-[320px]">
                    <div className="space-y-2 pr-2">
                      {selectedDayConfirmed.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-sm">Nenhum confirmado</p>
                      ) : (
                        selectedDayConfirmed.map(apt => <AppointmentCard key={apt.id} appointment={apt} />)
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="risco" className="mt-0">
                  <ScrollArea className="h-[320px]">
                    <div className="space-y-2 pr-2">
                      {selectedDayRisk.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-sm">Nenhum com risco</p>
                      ) : (
                        selectedDayRisk.map(apt => <AppointmentCard key={apt.id} appointment={apt} />)
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="cancelados" className="mt-0">
                  <ScrollArea className="h-[320px]">
                    <div className="space-y-2 pr-2">
                      {selectedDayCancelled.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-sm">Nenhum cancelado</p>
                      ) : (
                        selectedDayCancelled.map(apt => <AppointmentCard key={apt.id} appointment={apt} />)
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Right Panel - Calendar + Send Confirmation */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                Envio de Confirmações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Calendar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
                  {["S", "T", "Q", "Q", "S", "S", "D"].map((day, i) => (
                    <div key={i} className="text-muted-foreground font-medium py-1">{day}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
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
                          "p-1.5 text-xs rounded transition-colors aspect-square flex flex-col items-center justify-center",
                          isSelected && "bg-primary text-primary-foreground",
                          !isSelected && isToday(day) && "bg-accent",
                          !isSelected && !isToday(day) && "hover:bg-accent",
                          !isCurrentMonth && "text-muted-foreground/40",
                          isTargetDate && !isSelected && "ring-1 ring-primary"
                        )}
                      >
                        <span>{format(day, "d")}</span>
                        {dayData && dayData.total > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {dayData.confirmed > 0 && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
                            {dayData.pending > 0 && <div className="w-1 h-1 rounded-full bg-yellow-500" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Enviado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span>Pendente</span>
                  </div>
                </div>
              </div>

              {/* Selected Date - Pending Confirmations */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium truncate">
                      {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {pendingConfirmationAppointments.length} aguardando
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllForDate} className="text-xs h-7">
                      Todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs h-7">
                      Limpar
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[180px] mb-4">
                  <div className="space-y-2 pr-2">
                    {pendingConfirmationAppointments.length === 0 ? (
                      <div className="text-center py-6">
                        <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Todas enviadas!</p>
                      </div>
                    ) : (
                      pendingConfirmationAppointments.map(apt => (
                        <AppointmentCard key={apt.id} appointment={apt} showCheckbox />
                      ))
                    )}
                  </div>
                </ScrollArea>

                <Button 
                  onClick={sendConfirmation}
                  disabled={sendingConfirmation || selectedAppointments.length === 0}
                  className="w-full gap-2 h-11"
                  size="lg"
                >
                  {sendingConfirmation ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Enviar Confirmação ({selectedAppointments.length})</>
                  )}
                </Button>
                
                {isSameDay(selectedDate, confirmationTargetDate) && (
                  <p className="text-xs text-center text-primary font-medium mt-2">
                    📅 Data recomendada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No-Show Risk Calculation Section */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              Risco de No-Show
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Calcule o risco de falta para agendamentos de amanhã ({format(tomorrow, "dd/MM/yyyy")}).
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left - Risk Calendar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRiskCalendarMonth(subMonths(riskCalendarMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {format(riskCalendarMonth, "MMMM yyyy", { locale: ptBR })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRiskCalendarMonth(addMonths(riskCalendarMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
                  {["S", "T", "Q", "Q", "S", "S", "D"].map((day, i) => (
                    <div key={i} className="text-muted-foreground font-medium py-1">{day}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {riskCalendarDays.map(day => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayData = appointmentsByDay[dateKey];
                    const isCurrentMonth = isSameMonth(day, riskCalendarMonth);
                    const isTomorrow = isSameDay(day, tomorrow);
                    
                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          "p-1.5 text-xs rounded aspect-square flex flex-col items-center justify-center",
                          isTomorrow && "bg-orange-500 text-white font-bold",
                          !isTomorrow && isToday(day) && "bg-accent",
                          !isCurrentMonth && "text-muted-foreground/40"
                        )}
                      >
                        <span>{format(day, "d")}</span>
                        {dayData && dayData.total > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isTomorrow ? "bg-white" : "bg-muted-foreground/40"
                            )} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>Amanhã (elegível)</span>
                  </div>
                </div>
              </div>

              {/* Right - Leads list with scroll */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium truncate">
                      Agendamentos de amanhã
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {riskEligibleAppointments.length} pendente(s) | {riskCalculatedAppointments.length} calculado(s) | {selectedRiskAppointments.length} selecionado(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllRiskAppointments} className="text-xs h-7" disabled={riskEligibleAppointments.length === 0}>
                      Todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearRiskSelection} className="text-xs h-7">
                      Limpar
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[320px] flex-1 border rounded-lg">
                  <div className="space-y-2 p-2">
                    {riskEligibleAppointments.length === 0 && riskCalculatedAppointments.length === 0 ? (
                      <div className="text-center py-10">
                        <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum agendamento para amanhã</p>
                      </div>
                    ) : (
                      <>
                        {/* Pendente - Elegíveis para cálculo */}
                        {riskEligibleAppointments.length > 0 && (
                          <>
                            <div className="text-xs font-medium text-muted-foreground px-1 pt-1">
                              Pendentes ({riskEligibleAppointments.length})
                            </div>
                            {riskEligibleAppointments.map(apt => (
                              <div
                                key={apt.id}
                                className={cn(
                                  "p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
                                  selectedRiskAppointments.includes(apt.id) && "ring-2 ring-orange-500 bg-orange-500/5"
                                )}
                                onClick={() => toggleRiskAppointmentSelection(apt.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={selectedRiskAppointments.includes(apt.id)}
                                    onCheckedChange={() => toggleRiskAppointmentSelection(apt.id)}
                                    className="flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium text-sm truncate">
                                        {apt.patientName || apt.lead?.name || "Sem nome"}
                                      </span>
                                      <Badge variant="outline" className="text-xs flex-shrink-0">
                                        {formatISOToDisplay(apt.scheduled_at)}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {apt.phoneNumber || apt.lead?.phone || "N/A"}
                                      </span>
                                      <span className="flex items-center gap-1 truncate">
                                        <Briefcase className="h-3 w-3" />
                                        {apt.serviceName || "Serviço"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Já calculados - status diferente de pendente */}
                        {riskCalculatedAppointments.length > 0 && (
                          <>
                            <div className="text-xs font-medium text-muted-foreground px-1 pt-3">
                              Já Calculados ({riskCalculatedAppointments.length})
                            </div>
                            {riskCalculatedAppointments.map(apt => (
                              <div
                                key={apt.id}
                                className="p-2.5 rounded-lg border bg-muted/30"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium text-sm truncate">
                                        {apt.patientName || apt.lead?.name || "Sem nome"}
                                      </span>
                                      <StatusSelect
                                        value={apt.status || "pendente"}
                                        onValueChange={(status) => updateStatusMutation.mutate({ id: apt.id, status })}
                                        size="sm"
                                      />
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {apt.phoneNumber || apt.lead?.phone || "N/A"}
                                      </span>
                                      <span className="flex items-center gap-1 truncate">
                                        <Briefcase className="h-3 w-3" />
                                        {apt.serviceName || "Serviço"}
                                      </span>
                                      <Badge variant="outline" className="text-xs flex-shrink-0">
                                        {formatISOToDisplay(apt.scheduled_at)}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>

                {riskProgress && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Progresso do cálculo</span>
                      <span>{riskProgress.calculated + riskProgress.errors} / {riskProgress.total}</span>
                    </div>
                    <Progress value={((riskProgress.calculated + riskProgress.errors) / riskProgress.total) * 100} />
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-500">{riskProgress.calculated} calculado(s)</span>
                      {riskProgress.errors > 0 && <span className="text-red-500">{riskProgress.errors} erro(s)</span>}
                    </div>
                    {riskProgress.results.length > 0 && (
                      <ScrollArea className="h-24 mt-2">
                        <div className="space-y-1">
                          {riskProgress.results.map((res, idx) => (
                            <div 
                              key={idx} 
                              className={cn(
                                "text-xs p-2 rounded",
                                res.success ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-700 dark:text-red-400"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {res.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                <span className="font-medium truncate">{res.name}</span>
                              </div>
                              <p className="text-xs pl-5 mt-1 whitespace-pre-wrap">{res.result}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}

                <Button 
                  onClick={calculateNoShowRisk}
                  disabled={calculatingRisk || selectedRiskAppointments.length === 0}
                  className="w-full gap-2 h-10 bg-orange-500 hover:bg-orange-600 text-white mt-3"
                >
                  {calculatingRisk ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Calculando...</>
                  ) : (
                    <><Activity className="h-4 w-4" /> Calcular Risco ({selectedRiskAppointments.length})</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
