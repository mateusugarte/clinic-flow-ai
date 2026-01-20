import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence, Variants } from "framer-motion";

export function WelcomeMessage() {
  const { user } = useAuth();

  const { data: aiConfig } = useQuery({
    queryKey: ["ai-config-welcome", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_configs")
        .select("clinic_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const clinicName = aiConfig?.clinic_name || "sua clínica";

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.1,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      filter: "blur(8px)",
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 15,
      },
    },
  };

  const clinicNameVariants: Variants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      x: -20,
      filter: "blur(10px)",
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      x: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 150,
        damping: 12,
        delay: 0.2,
      },
    },
  };

  const underlineVariants: Variants = {
    hidden: { scaleX: 0, originX: 0 },
    visible: { 
      scaleX: 1,
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 20,
        delay: 0.5,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative"
    >
      <h1 className="text-3xl font-bold text-foreground flex items-baseline gap-2 flex-wrap">
        <motion.span variants={wordVariants}>Olá,</motion.span>
        <AnimatePresence mode="wait">
          <motion.span
            key={clinicName}
            variants={clinicNameVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            className="text-primary relative inline-block"
          >
            {clinicName}
            <motion.span
              variants={underlineVariants}
              className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary/30 rounded-full"
            />
          </motion.span>
        </AnimatePresence>
      </h1>
    </motion.div>
  );
}