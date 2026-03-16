import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FICHA_PERGUNTAS, FICHA_CATEGORIAS, getPerguntasByCategoria } from "@/lib/fichaPerguntas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Save, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function FichaTemplateEditor({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>(FICHA_PERGUNTAS.map((p) => p.id));

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

  useEffect(() => {
    if (config?.perguntas_ativas) {
      const ativas = config.perguntas_ativas as string[];
      if (ativas.length > 0) setSelectedIds(ativas);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ficha_config")
        .upsert(
          { user_id: user!.id, perguntas_ativas: selectedIds, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ficha-config"] });
      toast({ title: "Ficha salva com sucesso!" });
      onClose?.();
    },
  });

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCategoria = (cat: string) => {
    const ids = getPerguntasByCategoria(cat).map((p) => p.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((x) => !ids.includes(x)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Editar Ficha de Anamnese</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Selecione as perguntas que deseja incluir na ficha. As não selecionadas serão marcadas como "Não pedir".
      </p>

      <ScrollArea className="h-[60vh] max-h-[500px] pr-2">
        <div className="space-y-4">
          {FICHA_CATEGORIAS.map((cat) => {
            const perguntas = getPerguntasByCategoria(cat);
            const allSelected = perguntas.every((p) => selectedIds.includes(p.id));
            const someSelected = perguntas.some((p) => selectedIds.includes(p.id));

            return (
              <div key={cat} className="space-y-2">
                <div
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => toggleCategoria(cat)}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                      allSelected
                        ? "bg-primary border-primary"
                        : someSelected
                        ? "bg-primary/30 border-primary"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {(allSelected || someSelected) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <Label className="text-sm font-semibold text-foreground cursor-pointer group-hover:text-primary transition-colors">
                    {cat}
                  </Label>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {perguntas.map((p) => {
                    const isActive = selectedIds.includes(p.id);
                    return (
                      <Badge
                        key={p.id}
                        variant={isActive ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all text-xs py-1 px-2.5",
                          isActive
                            ? "bg-primary text-primary-foreground hover:bg-primary/80"
                            : "text-muted-foreground hover:text-foreground hover:border-primary/50"
                        )}
                        onClick={() => toggle(p.id)}
                      >
                        {isActive ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1 opacity-50" />}
                        {p.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex justify-between items-center pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} de {FICHA_PERGUNTAS.length} perguntas selecionadas
        </p>
        <div className="flex gap-2">
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
    </div>
  );
}
