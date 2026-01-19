import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Clock,
  Play,
  Pause,
  TrendingUp,
  Users,
  Calendar,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type LeadQualification = "entrou_em_contato" | "respondendo_duvidas" | "repassando_disponibilidade" | "fez_agendamento" | "repassado_atendimento";
type DateFilter = "today" | "7days" | "15days" | "30days";

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
  const [isLeadSheetOpen, setIsLeadSheetOpen] = useState(false);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  const getFilterDate = () => {
    const now = new Date();
    switch (dateFilter) {
      case "today": return startOfDay(now);
      case "7days": return startOfDay(subDays(now, 7));
      case "15days": return startOfDay(subDays(now, 15));
      case "30days": return startOfDay(subDays(now, 30));
    }
  };

  const { data: leads, isLoading } = useQuery({
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

  const updateLead = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("leads").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: () => toast({ variant: "destructive", title: "Erro ao atualizar lead" }),
  });

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
      updateLead.mutate({ id: draggedLead, updates: { qualification } });
      setDraggedLead(null);
    }
  };

  const totalLeads = leads?.length || 0;
  const leadsWithIA = leads?.filter(l => l.ia === "sim").length || 0;
  const leadsAgendados = leads?.filter(l => l.qualification === "fez_agendamento").length || 0;
  const conversionRate = totalLeads > 0 ? ((leadsAgendados / totalLeads) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">CRM / Kanban</h1>
          <p className="text-muted-foreground">Gerencie seus leads em um pipeline visual</p>
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

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Total de Leads</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalLeads}</p></CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Play className="h-4 w-4 text-primary" />Com IA Ativa</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{leadsWithIA}</p></CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Taxa de Conversão</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{conversionRate}%</p></CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="space-y-3" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(column.id)}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{column.title}</h3>
              <Badge variant="secondary" className="text-xs">{getLeadsForColumn(column.id).length}</Badge>
            </div>
            <div className="space-y-3 min-h-96 p-3 rounded-xl bg-muted/30 border border-border">
              {getLeadsForColumn(column.id).map((lead) => (
                <motion.div key={lead.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  draggable onDragStart={() => handleDragStart(lead.id)} onDragEnd={handleDragEnd}
                  className={`group cursor-grab active:cursor-grabbing ${draggedLead === lead.id ? "opacity-50" : ""}`}>
                  <Card className="shadow-sm hover:shadow-md transition-all border-l-4 border-l-primary"
                    onClick={() => { setSelectedLead(lead); setIsLeadSheetOpen(true); }}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{lead.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleIA(lead.id, lead.ia); }}>
                          {lead.ia === "sim" ? <Pause className="h-4 w-4 text-yellow-500" /> : <Play className="h-4 w-4 text-green-500" />}
                        </Button>
                      </div>
                      {lead.last_interaction && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />{format(new Date(lead.last_interaction), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {getLeadsForColumn(column.id).length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">Nenhum lead</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Lead Sheet */}
      <Sheet open={isLeadSheetOpen} onOpenChange={setIsLeadSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Detalhes do Lead</SheetTitle></SheetHeader>
          {selectedLead && (
            <div className="mt-6 space-y-4">
              <div><Label className="text-muted-foreground">Nome</Label><p className="font-medium">{selectedLead.name}</p></div>
              <div><Label className="text-muted-foreground">ID</Label><p className="font-mono text-sm">{selectedLead.id.slice(0, 8)}</p></div>
              <div><Label className="text-muted-foreground">Telefone</Label><p>{selectedLead.phone}</p></div>
              <div><Label className="text-muted-foreground">Email</Label><p>{selectedLead.email || "Não informado"}</p></div>
              <div><Label className="text-muted-foreground">Qualificação</Label><p>{columns.find(c => c.id === selectedLead.qualification)?.title || selectedLead.qualification}</p></div>
              <div><Label className="text-muted-foreground">IA</Label><p>{selectedLead.ia === "sim" ? "Ativa" : "Pausada"}</p></div>
              <div><Label className="text-muted-foreground">Última Interação</Label><p>{selectedLead.last_interaction ? format(new Date(selectedLead.last_interaction), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "N/A"}</p></div>
              <div><Label className="text-muted-foreground">Tempo Economizado</Label><p>{selectedLead.tempo_economizado || 0} min</p></div>
              {selectedLead.notes && <div><Label className="text-muted-foreground">Notas</Label><p>{selectedLead.notes}</p></div>}
              {selectedLead.tags?.length > 0 && <div><Label className="text-muted-foreground">Tags</Label><div className="flex gap-1 flex-wrap mt-1">{selectedLead.tags.map((tag: string, i: number) => <Badge key={i} variant="secondary">{tag}</Badge>)}</div></div>}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
