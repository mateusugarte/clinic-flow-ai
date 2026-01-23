import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  MessageSquare, 
  Calendar,
  ChevronRight,
  Bell
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingConfirmation {
  date: Date;
  count: number;
  notSentCount: number;
}

interface ActionAlertsProps {
  pendingConfirmations: PendingConfirmation[];
  noShowRiskCount: number;
}

export function ActionAlerts({ pendingConfirmations, noShowRiskCount }: ActionAlertsProps) {
  const navigate = useNavigate();

  // Filter only dates with pending confirmations (not sent)
  const alertsToShow = pendingConfirmations.filter(p => p.notSentCount > 0);

  if (alertsToShow.length === 0 && noShowRiskCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {/* Pending Confirmations Alerts */}
      {alertsToShow.map((pending, index) => {
        const formattedDate = format(pending.date, "EEEE, dd 'de' MMMM", { locale: ptBR });
        const isUrgent = index === 0; // First upcoming date is most urgent

        return (
          <Alert
            key={pending.date.toISOString()}
            className={`border-l-4 ${
              isUrgent 
                ? "border-l-orange-500 bg-orange-500/5" 
                : "border-l-yellow-500 bg-yellow-500/5"
            }`}
          >
            <Bell className={`h-4 w-4 ${isUrgent ? "text-orange-500" : "text-yellow-500"}`} />
            <AlertTitle className="flex items-center gap-2">
              <span>Confirmações Pendentes</span>
              <Badge 
                variant="outline" 
                className={`${
                  isUrgent 
                    ? "border-orange-500/50 text-orange-600 dark:text-orange-400" 
                    : "border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                }`}
              >
                {pending.notSentCount} não enviadas
              </Badge>
            </AlertTitle>
            <AlertDescription className="flex items-center justify-between mt-1">
              <span className="text-sm">
                Você ainda não solicitou a confirmação dos agendamentos de{" "}
                <strong className="capitalize">{formattedDate}</strong>
                {pending.count > pending.notSentCount && (
                  <span className="text-muted-foreground">
                    {" "}({pending.count - pending.notSentCount} de {pending.count} já enviadas)
                  </span>
                )}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="ml-4 flex-shrink-0"
                onClick={() => navigate("/nutricao-confirmacao")}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Enviar Confirmações
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}

      {/* No-Show Risk Alert */}
      {noShowRiskCount > 0 && (
        <Alert className="border-l-4 border-l-red-500 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertTitle className="flex items-center gap-2">
            <span>Risco de No-Show Detectado</span>
            <Badge variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400">
              {noShowRiskCount} pacientes
            </Badge>
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-1">
            <span className="text-sm">
              Existem <strong>{noShowRiskCount} agendamentos</strong> com risco de falta para hoje.
              Entre em contato para confirmar a presença.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-4 flex-shrink-0 border-red-500/30 text-red-600 hover:bg-red-500/10"
              onClick={() => navigate("/nutricao-confirmacao")}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Ver Detalhes
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </motion.div>
  );
}
