import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FICHA_PERGUNTAS } from "@/lib/fichaPerguntas";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Check, X } from "lucide-react";

interface FichaResumoProps {
  leadId: string;
}

export function FichaResumo({ leadId }: FichaResumoProps) {
  const { user } = useAuth();

  const { data: fichaData } = useQuery({
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

  const activeIds: string[] = config?.perguntas_ativas
    ? (config.perguntas_ativas as string[])
    : FICHA_PERGUNTAS.map((p) => p.id);

  const respostas = (fichaData?.respostas || {}) as Record<string, string | boolean>;
  const activePerguntas = FICHA_PERGUNTAS.filter((p) => activeIds.includes(p.id));
  const categorias = [...new Set(activePerguntas.map((p) => p.categoria))];

  if (!fichaData) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
        <ClipboardList className="h-4 w-4" />
        <span>Ficha de anamnese não preenchida</span>
      </div>
    );
  }

  const filledCount = Object.values(respostas).filter((v) => v !== "" && v !== false && v !== undefined).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">Ficha de Anamnese</Label>
        </div>
        <Badge variant="secondary" className="text-xs">
          {filledCount}/{activePerguntas.length}
        </Badge>
      </div>

      <ScrollArea className="max-h-[200px]">
        <div className="space-y-3">
          {categorias.map((cat) => {
            const perguntas = activePerguntas.filter((p) => p.categoria === cat);
            const hasAnyAnswer = perguntas.some((p) => {
              const v = respostas[p.id];
              return v !== undefined && v !== "" && v !== false;
            });
            if (!hasAnyAnswer) return null;

            return (
              <div key={cat} className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground font-medium">{cat}</p>
                {perguntas.map((p) => {
                  const val = respostas[p.id];
                  if (val === undefined || val === "" || val === false) return null;
                  return (
                    <div key={p.id} className="flex items-start gap-2 text-xs">
                      {typeof val === "boolean" ? (
                        <Check className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                      ) : null}
                      <span className="text-muted-foreground">{p.label}:</span>
                      <span className="text-foreground font-medium">
                        {typeof val === "boolean" ? "Sim" : String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
