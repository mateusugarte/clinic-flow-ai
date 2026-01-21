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

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "waiting" | "connected" | "disconnected">(
    isConnected ? "connected" : "idle"
  );

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
      const { data, error } = await supabase.functions.invoke("whatsapp-proxy", {
        body: { acao: "criar instancia e gerar qr code" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log("WhatsApp response:", data);
      // Extract base64 QR code from response - it comes as data.base64 with full data URL
      const base64 = data?.base64 || data?.qrcode || data?.qr || data;
      if (base64) {
        setQrCode(typeof base64 === "string" ? base64 : JSON.stringify(base64));
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
      const { data, error } = await supabase.functions.invoke("whatsapp-proxy", {
        body: { acao: "gerar qr code", phone: connectedPhone },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log("WhatsApp QR response:", data);
      const base64 = data?.base64 || data?.qrcode || data?.qr || data;
      if (base64) {
        setQrCode(typeof base64 === "string" ? base64 : JSON.stringify(base64));
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
      const { data, error } = await supabase.functions.invoke("whatsapp-proxy", {
        body: { acao: "verificar conexao" },
      });
      if (error) throw error;
      return typeof data === "string" ? data : JSON.stringify(data);
    },
    onSuccess: async (data) => {
      const isConnectedResult = data.toLowerCase().includes("conectado") || data.toLowerCase().includes("connected") || data.toLowerCase().includes("true");
      if (isConnectedResult) {
        await updateConnectionStatus(true);
        setConnectionStatus("connected");
        setQrCode(null);
        setIsTimerActive(false);
        toast({ title: "WhatsApp conectado com sucesso!" });
      } else {
        setConnectionStatus("disconnected");
        toast({ variant: "destructive", title: "Não conectado", description: data });
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
      const { data, error } = await supabase.functions.invoke("whatsapp-proxy", {
        body: { acao: "desconectar" },
      });
      if (error) throw error;
      return data;
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
                      src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
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
