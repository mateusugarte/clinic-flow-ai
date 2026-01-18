import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, Reorder } from "framer-motion";
import {
  User,
  Phone,
  Clock,
  Play,
  Pause,
  GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type LeadQualification = "entrou_em_contato" | "respondendo_duvidas" | "repassando_disponibilidade" | "fez_agendamento" | "repassado_atendimento";

const columns: { id: LeadQualification; title: string }[] = [
  { id: "entrou_em_contato", title: "Contato" },
  { id: "respondendo_duvidas", title: "Dúvidas" },
  { id: "repassando_disponibilidade", title: "Disponibilidade" },
  { id: "fez_agendamento", title: "Agendado" },
];

export default function CRM() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id)
        .order("last_interaction", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Update lead mutation
  const updateLead = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao atualizar lead" });
    },
  });

  const toggleIA = (leadId: string, currentIA: string | null) => {
    const newIA = currentIA === "sim" ? "não" : "sim";
    updateLead.mutate({ id: leadId, updates: { ia: newIA } });
    toast({
      title: newIA === "sim" ? "IA ativada" : "IA pausada",
      description: `IA ${newIA === "sim" ? "ativada" : "pausada"} para este lead`,
    });
  };

  const moveToColumn = (leadId: string, newQualification: LeadQualification) => {
    updateLead.mutate({ id: leadId, updates: { qualification: newQualification } });
  };

  const getLeadsForColumn = (qualification: LeadQualification) => {
    return leads?.filter((lead) => lead.qualification === qualification) || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">CRM / Kanban</h1>
        <p className="text-muted-foreground">Gerencie seus leads em um pipeline visual</p>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                {column.title}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {getLeadsForColumn(column.id).length}
              </Badge>
            </div>

            <div className="space-y-3 min-h-96 p-3 rounded-xl bg-muted/30 border border-border">
              {getLeadsForColumn(column.id).map((lead) => (
                <motion.div
                  key={lead.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group"
                >
                  <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{lead.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleIA(lead.id, lead.ia)}
                        >
                          {lead.ia === "sim" ? (
                            <Pause className="h-4 w-4 text-warning" />
                          ) : (
                            <Play className="h-4 w-4 text-success" />
                          )}
                        </Button>
                      </div>

                      {lead.last_interaction && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(lead.last_interaction), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      )}

                      {/* Quick move buttons */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {columns
                          .filter((c) => c.id !== column.id)
                          .slice(0, 2)
                          .map((c) => (
                            <Button
                              key={c.id}
                              variant="outline"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => moveToColumn(lead.id, c.id)}
                            >
                              → {c.title}
                            </Button>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {getLeadsForColumn(column.id).length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum lead
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
