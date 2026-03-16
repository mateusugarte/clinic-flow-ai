import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FICHA_PERGUNTAS, FICHA_CATEGORIAS, getPerguntasByCategoria } from "@/lib/fichaPerguntas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Save, ArrowLeft, FileText, ClipboardList, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageTransition, FadeIn } from "@/components/ui/page-transition";

export default function FichaConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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
      navigate("/clientes");
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

  const activePerguntas = FICHA_PERGUNTAS.filter((p) => selectedIds.includes(p.id));
  const activeCategorias = [...new Set(activePerguntas.map((p) => p.categoria))];
  const inactivePerguntas = FICHA_PERGUNTAS.filter((p) => !selectedIds.includes(p.id));

  return (
    <PageTransition className="h-full flex flex-col gap-3">
      {/* Header */}
      <FadeIn direction="down" className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Ficha de Anamnese</h1>
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} de {FICHA_PERGUNTAS.length} perguntas selecionadas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/clientes")}>
            Cancelar
          </Button>
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
      </FadeIn>

      {/* Two-panel layout */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* LEFT: Preview of selected questions */}
        <Card className="shadow-card border-0 flex flex-col min-h-0">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Prévia da Ficha
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">Perguntas que serão exibidas ao preencher</p>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
            <div className="h-full overflow-y-auto px-4 pb-4">
              {activeCategorias.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma pergunta selecionada
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCategorias.map((cat) => {
                    const perguntas = activePerguntas.filter((p) => p.categoria === cat);
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <p className="text-xs font-semibold text-foreground">{cat}</p>
                        </div>
                        <div className="pl-3 border-l-2 border-primary/10 space-y-1">
                          {perguntas.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 py-0.5">
                              <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                              <span className="text-xs text-muted-foreground">{p.label}</span>
                              {p.tipo === "booleano" && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5">Sim/Não</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Show excluded items */}
                  {inactivePerguntas.length > 0 && (
                    <div className="border-t border-border pt-3 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] uppercase text-muted-foreground font-medium">
                          Não pedir ({inactivePerguntas.length})
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {inactivePerguntas.map((p) => (
                          <Badge
                            key={p.id}
                            variant="outline"
                            className="text-[10px] text-muted-foreground/60 line-through cursor-pointer hover:text-foreground hover:no-underline"
                            onClick={() => toggle(p.id)}
                          >
                            {p.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Tag selector */}
        <Card className="shadow-card border-0 flex flex-col min-h-0">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Selecionar Perguntas
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">Clique nas tags para incluir ou excluir da ficha</p>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
            <div className="h-full overflow-y-auto px-4 pb-4">
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
                        <Label className="text-xs font-semibold text-foreground cursor-pointer group-hover:text-primary transition-colors">
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
                                "cursor-pointer transition-all text-[11px] py-1 px-2",
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
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
