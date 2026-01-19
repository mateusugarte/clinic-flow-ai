import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Bot, Building2, Phone, MapPin, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function IAConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    clinic_name: "", agent_name: "", owner_name: "", support_phone: "", connected_phone: "", opening_hours: "",
    addresses: [] as string[], negative_constraints: "", delay_policy: "", allow_upsell: false, Aut1: "", Aut2: "", Aut3: "",
  });
  const [newAddress, setNewAddress] = useState("");

  const { data: config, isLoading } = useQuery({
    queryKey: ["ai-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_configs").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (config) {
      const removePrefix = (phone: string | null) => {
        if (!phone) return "";
        return phone.startsWith("55") ? phone.slice(2) : phone;
      };
      setFormData({
        clinic_name: config.clinic_name || "", agent_name: config.agent_name || "", owner_name: config.owner_name || "",
        support_phone: config.support_phone || "", connected_phone: removePrefix(config.connected_phone),
        opening_hours: config.opening_hours || "", addresses: Array.isArray(config.addresses) ? config.addresses as string[] : [],
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

      const payload = {
        ...formData,
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
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agente de IA</h1>
          <p className="text-sm text-muted-foreground">Configure o comportamento do seu agente</p>
        </div>
        <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} className="gradient-primary">
          {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Salvar
        </Button>
      </div>

      {/* Grid Layout - Fill Screen */}
      <div className="flex-1 grid grid-cols-12 gap-4 auto-rows-min overflow-y-auto">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Horário de Funcionamento</Label><Input value={formData.opening_hours} onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })} placeholder="Seg a Sex 08:00-18:00" /></div>
              <div className="space-y-2">
                <Label className="text-xs">Número WhatsApp</Label>
                <div className="flex gap-2"><span className="flex items-center px-3 bg-muted rounded-lg text-xs font-medium">+55</span><Input value={formData.connected_phone} onChange={(e) => setFormData({ ...formData, connected_phone: e.target.value.replace(/\D/g, "") })} placeholder="11999999999" /></div>
              </div>
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
