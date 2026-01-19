import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BlurFade } from "@/components/ui/blur-fade";

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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const clinicName = aiConfig?.clinic_name || "sua clínica";

  return (
    <BlurFade delay={0.1} duration={0.6}>
      <h1 className="text-3xl font-bold text-foreground">
        Olá, <span className="text-primary">{clinicName}</span>
      </h1>
    </BlurFade>
  );
}
