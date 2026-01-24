import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Briefcase, 
  UserCheck, 
  MessageSquare, 
  CheckCircle2, 
  ChevronRight,
  X,
  Settings,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  icon: React.ElementType;
  route: string;
  isComplete: boolean;
}

interface OnboardingChecklistProps {
  hasAiConfig: boolean;
  hasServices: boolean;
  hasProfessionals: boolean;
  hasWhatsAppConnection: boolean;
}

export function OnboardingChecklist({
  hasAiConfig,
  hasServices,
  hasProfessionals,
  hasWhatsAppConnection,
}: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: "ai-config",
      title: "Agente de IA",
      icon: Bot,
      route: "/ia-config",
      isComplete: hasAiConfig,
    },
    {
      id: "services",
      title: "Serviços",
      icon: Briefcase,
      route: "/servicos",
      isComplete: hasServices,
    },
    {
      id: "professionals",
      title: "Profissionais",
      icon: UserCheck,
      route: "/agendas",
      isComplete: hasProfessionals,
    },
    {
      id: "whatsapp",
      title: "WhatsApp",
      icon: MessageSquare,
      route: "/ia-config",
      isComplete: hasWhatsAppConnection,
    },
  ];

  const completedSteps = steps.filter((s) => s.isComplete).length;
  const allComplete = completedSteps === steps.length;
  const pendingSteps = steps.filter((s) => !s.isComplete);

  // Auto-dismiss when all complete after 8 seconds
  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(() => setIsDismissed(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [allComplete]);

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissed = localStorage.getItem("onboarding-dismissed");
    if (dismissed === "true" && allComplete) {
      setIsDismissed(true);
    }
  }, [allComplete]);

  const handleDismiss = () => {
    if (allComplete) {
      localStorage.setItem("onboarding-dismissed", "true");
    }
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div
          className={cn(
            "relative rounded-xl shadow-lg border overflow-hidden backdrop-blur-sm transition-all duration-300",
            allComplete 
              ? "bg-green-500/10 border-green-500/30" 
              : "bg-background/95 border-primary/20"
          )}
          style={{ width: isExpanded ? "280px" : "auto" }}
        >
          {/* Collapsed state - just the indicator */}
          {!isExpanded && (
            <motion.button
              onClick={() => setIsExpanded(true)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
                allComplete 
                  ? "text-green-600 dark:text-green-400 hover:bg-green-500/10" 
                  : "text-primary hover:bg-primary/5"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {allComplete ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sistema Configurado</span>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Settings className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                  </div>
                  <span>Configurar Sistema</span>
                  <span className="text-xs text-muted-foreground">
                    ({completedSteps}/{steps.length})
                  </span>
                </>
              )}
            </motion.button>
          )}

          {/* Expanded state - show details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    {allComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="text-xs font-semibold">
                      {allComplete ? "Tudo Pronto!" : "Configure o Sistema"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsExpanded(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-2 space-y-1">
                  {allComplete ? (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground">
                        Seu sistema está pronto para uso.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs h-7"
                        onClick={handleDismiss}
                      >
                        Fechar notificação
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] text-muted-foreground px-1 pb-1">
                        Complete as etapas pendentes:
                      </p>
                      {pendingSteps.map((step) => {
                        const Icon = step.icon;
                        return (
                          <motion.button
                            key={step.id}
                            onClick={() => {
                              navigate(step.route);
                              setIsExpanded(false);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-primary/5 transition-colors group"
                            whileHover={{ x: 2 }}
                          >
                            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-xs font-medium flex-1">
                              {step.title}
                            </span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                          </motion.button>
                        );
                      })}

                      {/* Completed steps indicator */}
                      {completedSteps > 0 && (
                        <div className="pt-1 mt-1 border-t border-border/50">
                          <p className="text-[10px] text-green-600 dark:text-green-400 px-1">
                            ✓ {completedSteps} etapa{completedSteps > 1 ? "s" : ""} completa{completedSteps > 1 ? "s" : ""}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
