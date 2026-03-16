import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FICHA_PERGUNTAS, FICHA_CATEGORIAS, getPerguntasByCategoria, type FichaPergunta } from "@/lib/fichaPerguntas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Save, FileText, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FichaClienteFormProps {
  leadId: string;
  leadName: string;
  onClose?: () => void;
}

export function FichaClienteForm({ leadId, leadName, onClose }: FichaClienteFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [respostas, setRespostas] = useState<Record<string, string | boolean>>({});

  // Get active questions from config
  const { data: config } = useQuery({
    queryKey: ["ficha-config", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ficha_config")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Get existing answers
  const { data: existingRespostas } = useQuery({
    queryKey: ["ficha-respostas", leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ficha_respostas")
        .select("*")
        .eq("user_id", user!.id)
        .eq("lead_id", leadId)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!leadId,
  });

  useEffect(() => {
    if (existingRespostas?.respostas) {
      setRespostas(existingRespostas.respostas as Record<string, string | boolean>);
    }
  }, [existingRespostas]);

  const activeIds: string[] = config?.perguntas_ativas
    ? (config.perguntas_ativas as string[])
    : FICHA_PERGUNTAS.map((p) => p.id);

  const activePerguntas = FICHA_PERGUNTAS.filter((p) => activeIds.includes(p.id));
  const activeCategorias = [...new Set(activePerguntas.map((p) => p.categoria))];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ficha_respostas")
        .upsert(
          {
            user_id: user!.id,
            lead_id: leadId,
            respostas: respostas,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,lead_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ficha-respostas"] });
      toast({ title: "Ficha salva com sucesso!" });
      onClose?.();
    },
  });

  const updateResposta = (id: string, value: string | boolean) => {
    setRespostas((prev) => ({ ...prev, [id]: value }));
  };

  const renderField = (pergunta: FichaPergunta) => {
    const value = respostas[pergunta.id];
    switch (pergunta.tipo) {
      case "booleano":
        return (
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground">{pergunta.label}</Label>
            <Switch
              checked={!!value}
              onCheckedChange={(checked) => updateResposta(pergunta.id, checked)}
            />
          </div>
        );
      case "textarea":
        return (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{pergunta.label}</Label>
            <Textarea
              value={(value as string) || ""}
              onChange={(e) => updateResposta(pergunta.id, e.target.value)}
              placeholder={`Responda: ${pergunta.label}`}
              className="min-h-[60px] text-sm"
            />
          </div>
        );
      default:
        return (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{pergunta.label}</Label>
            <Input
              value={(value as string) || ""}
              onChange={(e) => updateResposta(pergunta.id, e.target.value)}
              placeholder={`Responda: ${pergunta.label}`}
              className="text-sm"
            />
          </div>
        );
    }
  };

  const filledCount = Object.values(respostas).filter((v) => v !== "" && v !== false && v !== undefined).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-foreground">Ficha de Anamnese</h3>
          <p className="text-xs text-muted-foreground">{leadName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {filledCount}/{activePerguntas.length} preenchido(s)
        </Badge>
      </div>

      <ScrollArea className="h-[400px] pr-2">
        <div className="space-y-5">
          {activeCategorias.map((cat) => {
            const perguntas = activePerguntas.filter((p) => p.categoria === cat);
            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2 sticky top-0 bg-background py-1 z-10">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <Label className="text-sm font-semibold text-foreground">{cat}</Label>
                </div>
                <div className="space-y-3 pl-3 border-l-2 border-primary/10">
                  {perguntas.map((p) => (
                    <div key={p.id}>{renderField(p)}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        )}
        <Button
          size="sm"
          className="gap-1"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Salvando..." : "Salvar Ficha"}
        </Button>
      </div>
    </div>
  );
}
