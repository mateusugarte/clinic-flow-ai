import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agendas", label: "Agendas", icon: Calendar },
  { to: "/crm", label: "CRM", icon: Users },
  { to: "/clientes", label: "Clientes", icon: UserCheck },
  { to: "/servicos", label: "Serviços", icon: Briefcase },
  { to: "/ia-config", label: "Agente IA", icon: Bot },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold">
          <span className="text-foreground">GetMore</span>
          <span className="text-primary"> AI</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
        >
          {theme === "light" ? (
            <>
              <Moon className="h-5 w-5" />
              Modo Escuro
            </>
          ) : (
            <>
              <Sun className="h-5 w-5" />
              Modo Claro
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-40">
        <h1 className="text-xl font-bold">
          <span className="text-foreground">GetMore</span>
          <span className="text-primary"> AI</span>
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          className="lg:hidden fixed inset-0 top-16 bg-sidebar z-30 flex flex-col"
        >
          <SidebarContent />
        </motion.div>
      )}
    </>
  );
}
