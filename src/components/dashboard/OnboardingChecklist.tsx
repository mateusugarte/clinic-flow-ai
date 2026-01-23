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
  Sparkles,
  X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
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

  const steps: OnboardingStep[] = [
    {
      id: "ai-config",
      title: "Configure o Agente de IA",
      description: "Defina o nome da clínica, horários e regras do agente",
      icon: Bot,
      route: "/ia-config",
      isComplete: hasAiConfig,
    },
    {
      id: "services",
      title: "Cadastre seus Serviços",
      description: "Adicione os serviços oferecidos pela clínica",
      icon: Briefcase,
      route: "/servicos",
      isComplete: hasServices,
    },
    {
      id: "professionals",
      title: "Cadastre os Profissionais",
      description: "Adicione os profissionais que atendem na clínica",
      icon: UserCheck,
      route: "/agendas",
      isComplete: hasProfessionals,
    },
    {
      id: "whatsapp",
      title: "Conecte o WhatsApp",
      description: "Vincule o número do WhatsApp para atendimento",
      icon: MessageSquare,
      route: "/ia-config",
      isComplete: hasWhatsAppConnection,
    },
  ];

  const completedSteps = steps.filter((s) => s.isComplete).length;
  const progressPercent = (completedSteps / steps.length) * 100;
  const allComplete = completedSteps === steps.length;

  // Auto-dismiss when all complete
  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(() => setIsDismissed(true), 5000);
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
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={cn(
          "relative overflow-hidden border-0 shadow-card",
          allComplete 
            ? "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border-green-500/20" 
            : "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
        )}>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <Sparkles className="w-full h-full text-primary" />
          </div>

          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  {allComplete ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Configuração Completa!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-primary" />
                      Bem-vindo! Configure seu sistema
                    </>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {allComplete 
                    ? "Seu sistema está pronto para uso. Bom trabalho!" 
                    : "Complete as etapas abaixo para começar a usar o sistema"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{completedSteps}/{steps.length} etapas</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.button
                    key={step.id}
                    onClick={() => !step.isComplete && navigate(step.route)}
                    disabled={step.isComplete}
                    className={cn(
                      "relative flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                      step.isComplete 
                        ? "bg-green-500/10 border border-green-500/20 cursor-default" 
                        : "bg-card border border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                    )}
                    whileHover={!step.isComplete ? { scale: 1.02 } : {}}
                    whileTap={!step.isComplete ? { scale: 0.98 } : {}}
                  >
                    {/* Step number badge */}
                    <div className={cn(
                      "absolute -top-1 -left-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
                      step.isComplete 
                        ? "bg-green-500 text-white" 
                        : "bg-primary text-primary-foreground"
                    )}>
                      {step.isComplete ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                    </div>

                    <div className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                      step.isComplete 
                        ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                        : "bg-primary/10 text-primary"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        step.isComplete && "text-green-600 dark:text-green-400"
                      )}>
                        {step.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {step.description}
                      </p>
                    </div>

                    {!step.isComplete && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
