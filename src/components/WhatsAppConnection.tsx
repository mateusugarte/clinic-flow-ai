import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Loader2, CheckCircle2, XCircle, RefreshCw, QrCode, Unplug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";



interface WhatsAppConnectionProps {
  configId: string | undefined;
  isConnected: boolean;
  connectedPhone: string;
}

export default function WhatsAppConnection({ configId, isConnected, connectedPhone }: WhatsAppConnectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const SUPABASE_FUNCTIONS_URL = "https://qdsvbhtaldyjtfmujmyt.functions.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkc3ZiaHRhbGR5anRmbXVqbXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Nzc5MzksImV4cCI6MjA4MzU1MzkzOX0.hIQs0Ql2qHBrwJlJW54n22WJtjkA27_6maBLt3kyqik";

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "waiting" | "connected" | "disconnected">(
    isConnected ? "connected" : "idle"
  );

  const extractQrLink = (data: unknown): string | null => {
    if (!data) return null;
    
    // Se for string
    if (typeof data === "string") {
      // Se já for data:image, retorna direto
      if (data.startsWith("data:image")) return data;
      
      // Tenta extrair base64 de texto no formato: "base64": "data:image/png;base64,..."
      const base64Match = data.match(/"base64"\s*:\s*"([^"]+)"/);
      if (base64Match?.[1]) {
        return base64Match[1];
      }
      
      // Tenta extrair qualquer data:image do texto
      const dataImageMatch = data.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/);
      if (dataImageMatch?.[1]) {
        return dataImageMatch[1];
      }
      
      return null;
    }
    
    // Se for objeto
    if (typeof data === "object") {
      const d = data as Record<string, unknown>;
      const candidate = d.base64 ?? d.qrcode ?? d.qr;
      return typeof candidate === "string" ? candidate : null;
    }
    
    return null;
  };

  const invokeWhatsAppProxy = async (body: Record<string, unknown>) => {
    // This function should be callable without Supabase Auth.
    // Supabase gateway still requires anon key headers.
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/whatsapp-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // keep as text
    }

    if (!res.ok) {
      throw new Error(`Edge Function ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
    }

    return data;
  };

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && isTimerActive) {
      setIsTimerActive(false);
      setQrCode(null);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  // Update connection status when prop changes
  useEffect(() => {
    setConnectionStatus(isConnected ? "connected" : "idle");
  }, [isConnected]);

  const updateConnectionStatus = async (connected: boolean) => {
    if (!configId) return;
    const { error } = await supabase
      .from("ai_configs")
      .update({ whatsapp_connected: connected })
      .eq("id", configId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["ai-config"] });
  };

  // Create instance and generate QR code
  const createInstance = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return invokeWhatsAppProxy({ acao: "criar instancia e gerar qr code", userID: user.id });
    },
    onSuccess: (data) => {
      console.log("WhatsApp response:", data);
      // Now we receive a ready-to-use link/text (ex: data:image/png;base64,...) – just render it in the mockup.
      const qrLink = extractQrLink(data);
      if (qrLink) {
        setQrCode(qrLink);
        setTimer(59);
        setIsTimerActive(true);
        setConnectionStatus("waiting");
        toast({ title: "QR Code gerado!", description: "Escaneie com seu WhatsApp" });
      } else {
        toast({ variant: "destructive", title: "Erro ao gerar QR Code" });
      }
    },
    onError: (error) => {
      console.error("WhatsApp error:", error);
      toast({ variant: "destructive", title: "Erro ao conectar com webhook" });
    },
  });

  // Generate QR code with phone number
  const generateQR = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return invokeWhatsAppProxy({ acao: "gerar qr code", phone: connectedPhone, userID: user.id });
    },
    onSuccess: (data) => {
      console.log("WhatsApp QR response:", data);
      const qrLink = extractQrLink(data);
      if (qrLink) {
        setQrCode(qrLink);
        setTimer(59);
        setIsTimerActive(true);
        setConnectionStatus("waiting");
        toast({ title: "QR Code gerado!", description: "Escaneie com seu WhatsApp" });
      } else {
        toast({ variant: "destructive", title: "Erro ao gerar QR Code" });
      }
    },
    onError: (error) => {
      console.error("WhatsApp QR error:", error);
      toast({ variant: "destructive", title: "Erro ao gerar QR Code" });
    },
  });

  // Verify connection
  const verifyConnection = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const data = await invokeWhatsAppProxy({ acao: "verificar conexao", userID: user.id });
      return typeof data === "string" ? data : JSON.stringify(data);
    },
    onSuccess: async (data) => {
      console.log("Verificar conexão response:", data);
      const normalizedData = data.toLowerCase();
      
      // Verifica se está conectado - aceita "conectado", "connected", "true" ou status: "conectado"
      const isConnectedResult = 
        (normalizedData.includes("conectado") && !normalizedData.includes("desconectado")) ||
        (normalizedData.includes("connected") && !normalizedData.includes("disconnected")) ||
        normalizedData.includes('"status":"conectado"') ||
        normalizedData.includes('"status": "conectado"') ||
        normalizedData === "true";
      
      if (isConnectedResult) {
        await updateConnectionStatus(true);
        setConnectionStatus("connected");
        setQrCode(null);
        setIsTimerActive(false);
        toast({ title: "WhatsApp conectado com sucesso!" });
      } else {
        // Atualiza para FALSE quando desconectado
        await updateConnectionStatus(false);
        setConnectionStatus("disconnected");
        toast({ 
          variant: "destructive", 
          title: "WhatsApp desconectado", 
          description: "A conexão foi atualizada no sistema." 
        });
      }
    },
    onError: (error) => {
      console.error("WhatsApp verify error:", error);
      toast({ variant: "destructive", title: "Erro ao verificar conexão" });
    },
  });

  // Disconnect
  const disconnect = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      return invokeWhatsAppProxy({ acao: "desconectar", userID: user.id });
    },
    onSuccess: async () => {
      await updateConnectionStatus(false);
      setConnectionStatus("idle");
      setQrCode(null);
      toast({ title: "WhatsApp desconectado" });
    },
    onError: (error) => {
      console.error("WhatsApp disconnect error:", error);
      toast({ variant: "destructive", title: "Erro ao desconectar" });
    },
  });

  const handleConnectionDone = useCallback(() => {
    verifyConnection.mutate();
  }, [verifyConnection]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLoading = createInstance.isPending || generateQR.isPending || verifyConnection.isPending || disconnect.isPending;

  return (
    <Card className="col-span-12 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          Conexão WhatsApp
          <span className={`ml-auto flex items-center gap-1 text-xs font-normal px-2 py-0.5 rounded-full ${
            connectionStatus === "connected" 
              ? "bg-green-500/10 text-green-500" 
              : connectionStatus === "waiting"
              ? "bg-yellow-500/10 text-yellow-500"
              : "bg-muted text-muted-foreground"
          }`}>
            {connectionStatus === "connected" ? (
              <><CheckCircle2 className="h-3 w-3" /> Conectado</>
            ) : connectionStatus === "waiting" ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Aguardando</>
            ) : (
              <><XCircle className="h-3 w-3" /> Desconectado</>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          {/* QR Code Area */}
          <div className="flex-shrink-0">
            <AnimatePresence mode="wait">
              {qrCode ? (
                <motion.div
                  key="qr"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative"
                >
                  <div className="p-3 bg-white rounded-xl shadow-lg">
                    <img
                      src={qrCode}
                      alt="QR Code WhatsApp"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  {isTimerActive && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                      {formatTime(timer)}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-muted-foreground/30"
                >
                  <div className="text-center text-muted-foreground">
                    <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">QR Code aparecerá aqui</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions Area */}
          <div className="flex-1 space-y-4">
            <p className="text-sm text-muted-foreground">
              {connectionStatus === "connected"
                ? "Seu WhatsApp está conectado e pronto para uso."
                : connectionStatus === "waiting"
                ? "Escaneie o QR Code com seu WhatsApp para conectar."
                : "Conecte seu WhatsApp para começar a usar o agente de IA."}
            </p>

            <div className="flex flex-wrap gap-2">
              {connectionStatus !== "connected" && !qrCode && (
                <Button
                  onClick={() => createInstance.mutate()}
                  disabled={isLoading}
                  className="gradient-primary"
                >
                  {createInstance.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <MessageCircle className="h-4 w-4 mr-2" />
                  )}
                  Conectar ao WhatsApp
                </Button>
              )}

              {qrCode && isTimerActive && (
                <Button
                  onClick={handleConnectionDone}
                  disabled={isLoading}
                  variant="outline"
                  className="border-green-500 text-green-500 hover:bg-green-500/10"
                >
                  {verifyConnection.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Conexão Feita
                </Button>
              )}

              {connectionStatus === "connected" && (
                <>
                  <Button
                    onClick={() => generateQR.mutate()}
                    disabled={isLoading}
                    variant="outline"
                  >
                    {generateQR.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <QrCode className="h-4 w-4 mr-2" />
                    )}
                    Gerar QR Code
                  </Button>

                  <Button
                    onClick={() => verifyConnection.mutate()}
                    disabled={isLoading}
                    variant="outline"
                  >
                    {verifyConnection.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Verificar Conexão
                  </Button>

                  <Button
                    onClick={() => disconnect.mutate()}
                    disabled={isLoading}
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                  >
                    {disconnect.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Unplug className="h-4 w-4 mr-2" />
                    )}
                    Desconectar
                  </Button>
                </>
              )}

              {connectionStatus !== "connected" && !qrCode && (
                <Button
                  onClick={() => verifyConnection.mutate()}
                  disabled={isLoading}
                  variant="ghost"
                >
                  {verifyConnection.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Verificar Conexão
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
