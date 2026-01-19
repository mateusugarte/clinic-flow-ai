import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Briefcase,
  Bot,
  FileBarChart,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", label: "DASHBOARD", icon: LayoutDashboard },
  { to: "/agendas", label: "AGENDAS", icon: Calendar },
  { to: "/crm", label: "CRM / KANBAN", icon: Users },
  { to: "/clientes", label: "CLIENTES", icon: UserCheck },
  { to: "/servicos", label: "SERVIÇOS", icon: Briefcase },
  { to: "/ia-config", label: "AGENTE DE IA", icon: Bot },
  { to: "/relatorios", label: "RELATÓRIOS", icon: FileBarChart },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <>
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border z-40">
        {/* Logo */}
        <div className="px-6 py-8">
          <h1 className="text-xl font-semibold tracking-tight">
            <span className="text-foreground">GetMore</span>
            <span className="text-primary"> AI</span>
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )
              }
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="tracking-wide">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-start gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-xl"
          >
            {theme === "light" ? (
              <>
                <Moon className="h-[18px] w-[18px]" />
                <span className="text-sm font-medium">Modo Escuro</span>
              </>
            ) : (
              <>
                <Sun className="h-[18px] w-[18px]" />
                <span className="text-sm font-medium">Modo Claro</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 px-4 py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span className="text-sm font-medium">Sair</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header - Simplified */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center px-4 z-40">
        <h1 className="text-lg font-semibold">
          <span className="text-foreground">GetMore</span>
          <span className="text-primary"> AI</span>
        </h1>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around z-40 safe-area-pb">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 p-2 text-2xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
          </NavLink>
        ))}
      </nav>
    </>
  );
}
