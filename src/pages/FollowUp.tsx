import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, Wrench, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function FollowUp() {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="max-w-md w-full shadow-card border-2 border-dashed border-primary/30">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Construction className="h-16 w-16 text-primary" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-1 -right-1"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="h-6 w-6 text-yellow-500" />
                </motion.div>
              </div>
            </div>

            <div className="space-y-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-3 py-1">
                <Wrench className="h-3.5 w-3.5 mr-1.5" />
                Em Desenvolvimento
              </Badge>
              
              <h1 className="text-2xl font-bold tracking-tight">
                Follow-Up
              </h1>
              
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                Esta funcionalidade está sendo desenvolvida. Em breve você poderá gerenciar follow-ups automatizados para seus leads e agendamentos.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>Trabalhando nisso...</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
