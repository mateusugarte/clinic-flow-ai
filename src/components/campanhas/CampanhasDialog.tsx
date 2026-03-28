import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isBefore, isAfter, isWithinInterval, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Megaphone, Percent, Trash2, Edit, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type CampaignStatus = "ativa" | "futura" | "expirada";

function getCampaignStatus(start: string | null, end: string | null): CampaignStatus {
  if (!start || !end) return "futura";
  const now = new Date();
  const s = parseISO(start);
  const e = parseISO(end);
  if (isAfter(now, e)) return "expirada";
  if (isBefore(now, s)) return "futura";
  return "ativa";
}

function getStatusBadge(status: CampaignStatus) {
  switch (status) {
    case "ativa": return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Ativa</Badge>;
    case "futura": return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Futura</Badge>;
    case "expirada": return <Badge variant="secondary" className="opacity-60">Expirada</Badge>;
  }
}

function getDaysLabel(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const now = new Date();
  const s = parseISO(start);
  const e = parseISO(end);
  const status = getCampaignStatus(start, end);
  if (status === "futura") {
    const d = differenceInDays(s, now);
    return `Começa em ${d} dia${d !== 1 ? "s" : ""}`;
  }
  if (status === "ativa") {
    const d = differenceInDays(e, now);
    return `${d} dia${d !== 1 ? "s" : ""} restante${d !== 1 ? "s" : ""}`;
  }
  return "Encerrada";
}

interface CampanhasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampanhasDialog({ open, onOpenChange }: CampanhasDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [newServiceName, setNewServiceName] = useState("");
  const [isNewService, setIsNewService] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [hasPromotion, setHasPromotion] = useState(false);
  const [promotionalPrice, setPromotionalPrice] = useState(0);
  const [description, setDescription] = useState("");
  const [newServicePrice, setNewServicePrice] = useState(0);
  const [newServiceDuration, setNewServiceDuration] = useState(30);

  const { data: services } = useQuery({
    queryKey: ["services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const campaigns = services?.filter(s => s.is_seasonal) || [];
  const nonSeasonalServices = services?.filter(s => !s.is_seasonal) || [];

  const formatPrice = (price: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const resetForm = () => {
    setSelectedServiceId("");
    setNewServiceName("");
    setIsNewService(false);
    setStartDate(undefined);
    setEndDate(undefined);
    setHasPromotion(false);
    setPromotionalPrice(0);
    setDescription("");
    setNewServicePrice(0);
    setNewServiceDuration(30);
    setEditingId(null);
    setShowForm(false);
  };

  const saveCampaign = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) throw new Error("Datas obrigatórias");
      if (isBefore(endDate, startDate)) throw new Error("Data fim deve ser posterior à data início");
      if (hasPromotion && !promotionalPrice) throw new Error("Preço promocional obrigatório");

      const campaignData: any = {
        is_seasonal: true,
        seasonal_start_date: format(startDate, "yyyy-MM-dd"),
        seasonal_end_date: format(endDate, "yyyy-MM-dd"),
        has_promotion: hasPromotion,
        promotional_price: hasPromotion ? promotionalPrice : null,
        description: description || null,
      };

      if (editingId) {
        const { error } = await supabase.from("services").update(campaignData).eq("id", editingId);
        if (error) throw error;
      } else if (isNewService) {
        if (!newServiceName) throw new Error("Nome do serviço obrigatório");
        const { error } = await supabase.from("services").insert({
          ...campaignData,
          name: newServiceName,
          price: newServicePrice,
          duration: newServiceDuration,
          user_id: user!.id,
        });
        if (error) throw error;
      } else {
        if (!selectedServiceId) throw new Error("Selecione um serviço");
        const { error } = await supabase.from("services").update(campaignData).eq("id", selectedServiceId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      resetForm();
      toast({ title: editingId ? "Campanha atualizada!" : "Campanha criada!" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: e.message || "Erro ao salvar campanha" }),
  });

  const removeCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").update({
        is_seasonal: false,
        seasonal_start_date: null,
        seasonal_end_date: null,
        has_promotion: false,
        promotional_price: null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Campanha removida" });
    },
  });

  const handleEdit = (service: any) => {
    setEditingId(service.id);
    setStartDate(service.seasonal_start_date ? parseISO(service.seasonal_start_date) : undefined);
    setEndDate(service.seasonal_end_date ? parseISO(service.seasonal_end_date) : undefined);
    setHasPromotion(service.has_promotion || false);
    setPromotionalPrice(service.promotional_price || 0);
    setDescription(service.description || "");
    setShowForm(true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Campanhas
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {!showForm ? (
            <>
              <Button onClick={() => setShowForm(true)} className="w-full gradient-primary" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />Nova Campanha
              </Button>

              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma campanha definida ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(c => {
                    const status = getCampaignStatus(c.seasonal_start_date, c.seasonal_end_date);
                    return (
                      <Card key={c.id} className={cn("transition-all", status === "expirada" && "opacity-60")}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-sm">{c.name}</h4>
                                {getStatusBadge(status)}
                                {c.has_promotion && (
                                  <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30">
                                    <Percent className="h-3 w-3 mr-1" />Promoção
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {c.seasonal_start_date && format(parseISO(c.seasonal_start_date), "dd/MM/yyyy")} — {c.seasonal_end_date && format(parseISO(c.seasonal_end_date), "dd/MM/yyyy")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {getDaysLabel(c.seasonal_start_date, c.seasonal_end_date)}
                                </span>
                              </div>
                              {c.has_promotion && c.promotional_price && (
                                <div className="mt-1.5 text-sm">
                                  <span className="line-through text-muted-foreground mr-2">{formatPrice(c.price)}</span>
                                  <span className="font-semibold text-primary">{formatPrice(c.promotional_price)}</span>
                                </div>
                              )}
                              {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeCampaign.mutate(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">{editingId ? "Editar Campanha" : "Nova Campanha"}</h3>

              {!editingId && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Criar novo serviço?</Label>
                    <Switch checked={isNewService} onCheckedChange={setIsNewService} />
                  </div>

                  {isNewService ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nome do Serviço *</Label>
                        <Input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="Nome do novo serviço" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Preço (R$) *</Label>
                          <NumericInput value={newServicePrice} onChange={setNewServicePrice} allowDecimals />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Duração (min) *</Label>
                          <NumericInput value={newServiceDuration} onChange={setNewServiceDuration} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Serviço existente *</Label>
                      <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                        <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                        <SelectContent>
                          {nonSeasonalServices.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name} — {formatPrice(s.price)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Data Início *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data Fim *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-orange-500" />Tem promoção?
                  </Label>
                  <Switch checked={hasPromotion} onCheckedChange={setHasPromotion} />
                </div>
                {hasPromotion && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço Promocional (R$) *</Label>
                    <NumericInput value={promotionalPrice} onChange={setPromotionalPrice} allowDecimals />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Descrição da Campanha</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição ou regras da campanha..." rows={3} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
                <Button onClick={() => saveCampaign.mutate()} disabled={saveCampaign.isPending} className="flex-1 gradient-primary">
                  {editingId ? "Salvar" : "Criar Campanha"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
