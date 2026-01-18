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
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 flex-col bg-card border-r border-border z-40">
        {/* Logo */}
        <div className="p-8 pb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">GetMore</span>
            <span className="text-primary"> AI</span>
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-5 py-4 rounded-full text-sm font-medium tracking-wide transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-start gap-4 px-5 py-3 text-muted-foreground hover:text-foreground rounded-full"
          >
            {theme === "light" ? (
              <>
                <Moon className="h-5 w-5" />
                <span className="text-sm font-medium tracking-wide">MODO ESCURO</span>
              </>
            ) : (
              <>
                <Sun className="h-5 w-5" />
                <span className="text-sm font-medium tracking-wide">MODO CLARO</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-4 px-5 py-3 text-muted-foreground hover:text-destructive rounded-full"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium tracking-wide">SAIR</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header - Simplified */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center px-4 z-40">
        <h1 className="text-xl font-bold">
          <span className="text-foreground">GetMore</span>
          <span className="text-primary"> AI</span>
        </h1>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-40">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 p-2 text-xs transition-colors",
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
