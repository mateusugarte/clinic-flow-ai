import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Plus, Clock, DollarSign, Tag, Trash2, User, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DetailModal } from "@/components/ui/detail-modal";
import { useToast } from "@/hooks/use-toast";

const categories = ["Preventivo", "Restaurador", "Estético", "Cirúrgico"] as const;

export default function Servicos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "", duration: 30, price: 0, category: "Preventivo" as typeof categories[number] });

  const { data: services } = useQuery({
    queryKey: ["services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("user_id", user!.id).order("is_available", { ascending: false }).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: professionals } = useQuery({
    queryKey: ["professionals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("user_id", user!.id).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createService = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").insert({ ...formData, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setIsNewOpen(false);
      setFormData({ name: "", description: "", duration: 30, price: 0, category: "Preventivo" });
      toast({ title: "Serviço criado com sucesso!" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao criar serviço" }),
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("services").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setIsEditMode(false);
      toast({ title: "Serviço atualizado!" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao atualizar serviço" }),
  });

  const updateProfessional = useMutation({
    mutationFn: async ({ id, service_ids }: { id: string; service_ids: string[] }) => {
      const { error } = await supabase.from("professionals").update({ service_ids }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["professionals"] }),
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase.from("services").update({ is_available }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Serviço removido" });
    },
    onError: () => toast({ variant: "destructive", title: "Erro ao remover serviço" }),
  });

  const formatPrice = (price: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
  const getProfessionalsForService = (serviceId: string) => professionals?.filter(p => p.service_ids?.includes(serviceId)) || [];

  const handleServiceClick = (service: any) => {
    setSelectedService(service);
    setEditData({ ...service });
    setIsServiceModalOpen(true);
    setIsEditMode(false);
  };

  const handleAddProfessionalToService = (profId: string, serviceId: string, add: boolean) => {
    const prof = professionals?.find(p => p.id === profId);
    if (!prof) return;
    const newIds = add ? [...(prof.service_ids || []), serviceId] : prof.service_ids?.filter((id: string) => id !== serviceId) || [];
    updateProfessional.mutate({ id: profId, service_ids: newIds });
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
        <div><h1 className="text-2xl font-bold text-foreground">Serviços</h1><p className="text-sm text-muted-foreground">Gerencie os serviços da sua clínica</p></div>
        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogTrigger asChild><Button className="gradient-primary"><Plus className="h-4 w-4 mr-2" />Novo Serviço</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo Serviço</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do serviço" /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição do serviço" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Duração (min) *</Label><Input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>Preço (R$) *</Label><Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as typeof categories[number] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select>
              </div>
              <Button onClick={() => createService.mutate()} disabled={!formData.name || !formData.duration || createService.isPending} className="w-full gradient-primary">Criar Serviço</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Services Grid - Fill remaining space */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 content-start overflow-y-auto">
        {services?.map((service) => (
          <motion.div key={service.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`shadow-card hover:shadow-lg transition-shadow cursor-pointer h-full ${!service.is_available ? 'opacity-60' : ''}`} onClick={() => handleServiceClick(service)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-sm truncate ${!service.is_available ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{service.name}</h3>
                    </div>
                    {service.category && <Badge variant="secondary" className="mt-1 text-[10px]"><Tag className="h-2.5 w-2.5 mr-1" />{service.category}</Badge>}
                  </div>
                  <Switch checked={service.is_available ?? true} onCheckedChange={(checked) => { toggleAvailability.mutate({ id: service.id, is_available: checked }); }} onClick={(e) => e.stopPropagation()} />
                </div>
                {service.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{service.description}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{service.duration}min</span>
                  <span className="font-semibold text-primary text-sm flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatPrice(service.price)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {services?.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">Nenhum serviço cadastrado.</div>}
      </div>

      {/* Service Detail Modal */}
      <DetailModal isOpen={isServiceModalOpen} onClose={() => { setIsServiceModalOpen(false); setIsEditMode(false); }} title={isEditMode ? "Editar Serviço" : "Detalhes do Serviço"}>
        {selectedService && editData && (
          <div className="space-y-6">
            {isEditMode ? (
              <div className="space-y-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Descrição</Label><Textarea value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Duração (min)</Label><Input type="number" value={editData.duration} onChange={(e) => setEditData({ ...editData, duration: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>Preço (R$)</Label><Input type="number" step="0.01" value={editData.price} onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })} /></div>
                </div>
                <div className="space-y-2"><Label>Categoria</Label><Select value={editData.category || "Preventivo"} onValueChange={(v) => setEditData({ ...editData, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></div>
                <Button onClick={() => updateService.mutate({ id: selectedService.id, data: { name: editData.name, description: editData.description, duration: editData.duration, price: editData.price, category: editData.category } })} className="w-full gradient-primary">Salvar</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Nome</Label><p className="font-medium">{selectedService.name}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Categoria</Label><p>{selectedService.category}</p></div>
                </div>
                <div><Label className="text-muted-foreground text-xs">Descrição</Label><p className="text-sm">{selectedService.description || "Sem descrição"}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Duração</Label><p>{selectedService.duration} min</p></div>
                  <div><Label className="text-muted-foreground text-xs">Preço</Label><p className="text-lg font-semibold text-primary">{formatPrice(selectedService.price)}</p></div>
                </div>
                <div><Label className="text-muted-foreground text-xs">Disponível</Label><p>{selectedService.is_available ? "Sim" : "Não"}</p></div>
                
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Profissionais que realizam</Label>
                  <div className="mt-2 space-y-2">
                    {getProfessionalsForService(selectedService.id).map((prof) => (
                      <div key={prof.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg"><User className="h-4 w-4 text-primary" /><span className="text-sm">{prof.name}</span></div>
                    ))}
                    {getProfessionalsForService(selectedService.id).length === 0 && <p className="text-sm text-muted-foreground">Nenhum profissional</p>}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Adicionar/Remover Profissionais</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {professionals?.map((prof) => (
                      <div key={prof.id} className="flex items-center space-x-2">
                        <Checkbox id={`prof-${prof.id}`} checked={prof.service_ids?.includes(selectedService.id)} onCheckedChange={(checked) => handleAddProfessionalToService(prof.id, selectedService.id, !!checked)} />
                        <label htmlFor={`prof-${prof.id}`} className="text-sm">{prof.name}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={() => setIsEditMode(true)} className="w-full" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />Editar Serviço
                </Button>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
