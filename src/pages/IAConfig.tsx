import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Bot, Building2, Phone, MapPin, Plus, Trash2, Save, Loader2, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import WhatsAppConnection from "@/components/WhatsAppConnection";

export default function IAConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    clinic_name: "", agent_name: "", owner_name: "", support_phone: "", connected_phone: "",
    opening_hours_start_day: "seg",
    opening_hours_end_day: "sex",
    opening_hours_start_time: "08:00",
    opening_hours_end_time: "18:00",
    addresses: [] as string[], negative_constraints: "", delay_policy: "", allow_upsell: false, Aut1: "", Aut2: "", Aut3: "",
  });
  const [newAddress, setNewAddress] = useState("");

  // Days of week options
  const daysOfWeek = [
    { value: "seg", label: "Segunda" },
    { value: "ter", label: "Terça" },
    { value: "qua", label: "Quarta" },
    { value: "qui", label: "Quinta" },
    { value: "sex", label: "Sexta" },
    { value: "sab", label: "Sábado" },
    { value: "dom", label: "Domingo" },
  ];

  // Parse opening_hours string to structured format
  const parseOpeningHours = (hours: string | null): { startDay: string; endDay: string; startTime: string; endTime: string } => {
    if (!hours) return { startDay: "seg", endDay: "sex", startTime: "08:00", endTime: "18:00" };
    
    // Match format like "seg a sex das 08:00 às 18:00"
    const match = hours.match(/(\w+)\s*a\s*(\w+)\s*das?\s*(\d{2}:\d{2})\s*[àa]s?\s*(\d{2}:\d{2})/i);
    if (match) {
      return {
        startDay: match[1].toLowerCase(),
        endDay: match[2].toLowerCase(),
        startTime: match[3],
        endTime: match[4],
      };
    }
    return { startDay: "seg", endDay: "sex", startTime: "08:00", endTime: "18:00" };
  };

  // Format structured data to opening_hours string
  const formatOpeningHours = (startDay: string, endDay: string, startTime: string, endTime: string): string => {
    return `${startDay} a ${endDay} das ${startTime} às ${endTime}`;
  };

  const { data: config, isLoading } = useQuery({
    queryKey: ["ai-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_configs").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data as typeof data & { whatsapp_connected?: boolean };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (config) {
      const removePrefix = (phone: string | null) => {
        if (!phone) return "";
        return phone.startsWith("55") ? phone.slice(2) : phone;
      };
      const parsedHours = parseOpeningHours(config.opening_hours);
      setFormData({
        clinic_name: config.clinic_name || "", agent_name: config.agent_name || "", owner_name: config.owner_name || "",
        support_phone: config.support_phone || "", connected_phone: removePrefix(config.connected_phone),
        opening_hours_start_day: parsedHours.startDay,
        opening_hours_end_day: parsedHours.endDay,
        opening_hours_start_time: parsedHours.startTime,
        opening_hours_end_time: parsedHours.endTime,
        addresses: Array.isArray(config.addresses) ? config.addresses as string[] : [],
        negative_constraints: config.negative_constraints || "", delay_policy: config.delay_policy || "",
        allow_upsell: config.allow_upsell || false,
        Aut1: removePrefix(config.Aut1?.toString() || ""),
        Aut2: removePrefix(config.Aut2?.toString() || ""),
        Aut3: removePrefix(config.Aut3?.toString() || ""),
      });
    }
  }, [config]);

  const saveConfig = useMutation({
    mutationFn: async () => {
      const addPrefix = (phone: string) => {
        if (!phone) return null;
        const cleaned = phone.replace(/\s/g, "").replace(/\D/g, "");
        return cleaned ? `55${cleaned}` : null;
      };

      // Build opening_hours string from structured fields
      const opening_hours = formatOpeningHours(
        formData.opening_hours_start_day,
        formData.opening_hours_end_day,
        formData.opening_hours_start_time,
        formData.opening_hours_end_time
      );

      const payload = {
        clinic_name: formData.clinic_name,
        agent_name: formData.agent_name,
        owner_name: formData.owner_name,
        support_phone: formData.support_phone,
        addresses: formData.addresses,
        negative_constraints: formData.negative_constraints,
        delay_policy: formData.delay_policy,
        allow_upsell: formData.allow_upsell,
        opening_hours,
        user_id: user!.id,
        connected_phone: addPrefix(formData.connected_phone),
        Aut1: formData.Aut1 ? parseFloat(`55${formData.Aut1.replace(/\D/g, "")}`) : null,
        Aut2: formData.Aut2 ? parseFloat(`55${formData.Aut2.replace(/\D/g, "")}`) : null,
        Aut3: formData.Aut3 ? parseFloat(`55${formData.Aut3.replace(/\D/g, "")}`) : null,
        updated_at: new Date().toISOString(),
      };

      if (config?.id) {
        const { error } = await supabase.from("ai_configs").update(payload).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_configs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
      toast({ title: "Configurações salvas com sucesso!" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao salvar configurações" }),
  });

  const addAddress = () => { if (newAddress.trim()) { setFormData({ ...formData, addresses: [...formData.addresses, newAddress.trim()] }); setNewAddress(""); } };
  const removeAddress = (index: number) => { setFormData({ ...formData, addresses: formData.addresses.filter((_, i) => i !== index) }); };

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header - Compact */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-foreground">Agente de IA</h1>
          <p className="text-xs text-muted-foreground">Configure o comportamento do seu agente</p>
        </div>
        <Button size="sm" onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} className="h-8 gradient-primary">
          {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}Salvar
        </Button>
      </div>

      {/* Grid Layout - Fill Screen */}
      <div className="flex-1 grid grid-cols-12 gap-4 auto-rows-min overflow-y-auto">
        {/* WhatsApp Connection Card */}
        <WhatsAppConnection 
          configId={config?.id} 
          isConnected={config?.whatsapp_connected || false}
          connectedPhone={formData.connected_phone ? `55${formData.connected_phone}` : ""}
        />

        {/* Identity Card */}
        <Card className="col-span-12 lg:col-span-6 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Identidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Nome da Clínica</Label><Input value={formData.clinic_name} onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })} placeholder="Clínica Exemplo" /></div>
              <div className="space-y-2"><Label className="text-xs">Nome do Agente</Label><Input value={formData.agent_name} onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })} placeholder="Sofia" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Proprietário</Label><Input value={formData.owner_name} onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })} placeholder="Dr. João Silva" /></div>
              <div className="space-y-2"><Label className="text-xs">Telefone de Suporte</Label><Input value={formData.support_phone} onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
            </div>
            {/* Opening Hours - Fixed Format */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />Horário de Funcionamento</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={formData.opening_hours_start_day} onValueChange={(v) => setFormData({ ...formData, opening_hours_start_day: v })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">a</span>
                <Select value={formData.opening_hours_end_day} onValueChange={(v) => setFormData({ ...formData, opening_hours_end_day: v })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">das</span>
                <Input type="time" className="w-24" value={formData.opening_hours_start_time} onChange={(e) => setFormData({ ...formData, opening_hours_start_time: e.target.value })} />
                <span className="text-sm text-muted-foreground">às</span>
                <Input type="time" className="w-24" value={formData.opening_hours_end_time} onChange={(e) => setFormData({ ...formData, opening_hours_end_time: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground">Formato: {formData.opening_hours_start_day} a {formData.opening_hours_end_day} das {formData.opening_hours_start_time} às {formData.opening_hours_end_time}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Número WhatsApp</Label>
              <div className="flex gap-2"><span className="flex items-center px-3 bg-muted rounded-lg text-xs font-medium">+55</span><Input value={formData.connected_phone} onChange={(e) => setFormData({ ...formData, connected_phone: e.target.value.replace(/\D/g, "") })} placeholder="11999999999" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Addresses Card */}
        <Card className="col-span-12 lg:col-span-6 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Unidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Adicionar endereço..." onKeyDown={(e) => e.key === "Enter" && addAddress()} />
              <Button variant="outline" onClick={addAddress} size="icon"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {formData.addresses.map((address, index) => (
                <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="text-sm truncate">{address}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeAddress(index)} className="text-destructive hover:text-destructive h-7 w-7"><Trash2 className="h-3 w-3" /></Button>
                </motion.div>
              ))}
              {formData.addresses.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum endereço cadastrado</p>}
            </div>
          </CardContent>
        </Card>

        {/* Rules Card */}
        <Card className="col-span-12 lg:col-span-8 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-primary" />Regras & Vendas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Restrições / O que NÃO fazer</Label>
                <Textarea value={formData.negative_constraints} onChange={(e) => setFormData({ ...formData, negative_constraints: e.target.value })} placeholder="Ex: Não mencionar concorrentes..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Política de Atraso</Label>
                <Textarea value={formData.delay_policy} onChange={(e) => setFormData({ ...formData, delay_policy: e.target.value })} placeholder="Ex: Tolerância de 15 minutos..." rows={3} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label className="text-sm">Permitir Upsell</Label>
                <p className="text-xs text-muted-foreground">O agente pode sugerir serviços adicionais</p>
              </div>
              <Switch checked={formData.allow_upsell} onCheckedChange={(checked) => setFormData({ ...formData, allow_upsell: checked })} />
            </div>
          </CardContent>
        </Card>

        {/* Management Numbers Card */}
        <Card className="col-span-12 lg:col-span-4 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />Números de Gestão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Números que receberão notificações</p>
            {[1, 2, 3].map((num) => (
              <div key={num} className="space-y-1">
                <Label className="text-xs">Número {num}</Label>
                <div className="flex gap-2">
                  <span className="flex items-center px-2 bg-muted rounded-lg text-xs font-medium">+55</span>
                  <Input value={formData[`Aut${num}` as keyof typeof formData] as string} onChange={(e) => setFormData({ ...formData, [`Aut${num}`]: e.target.value.replace(/\D/g, "") })} placeholder="11999999999" className="text-sm" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
