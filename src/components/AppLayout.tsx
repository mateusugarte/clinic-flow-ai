import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AuroraBackground } from "@/components/ui/aurora-background";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Aurora background effect - subtle */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-30 dark:opacity-40"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% -20%, hsl(var(--primary) / 0.15), transparent),
              radial-gradient(ellipse 60% 40% at 80% 120%, hsl(var(--primary) / 0.1), transparent)
            `,
          }}
        />
      </div>
      
      <AppSidebar />
      <main className="lg:ml-72 pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen relative z-10">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
