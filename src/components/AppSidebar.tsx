import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassButton } from "@/components/ui/glass-button";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agendas", label: "Agendas", icon: Calendar },
  { to: "/crm", label: "CRM / Kanban", icon: Users },
  { to: "/clientes", label: "Clientes", icon: UserCheck },
  { to: "/servicos", label: "Serviços", icon: Briefcase },
  { to: "/ia-config", label: "Agente de IA", icon: Bot },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "hidden lg:flex fixed left-0 top-0 h-screen flex-col z-40",
          "bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-6">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
                  <span className="text-lg font-bold text-primary-foreground">G</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold">
                    <span className="text-foreground">GetMore</span>
                    <span className="text-primary"> AI</span>
                  </h1>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isCollapsed && (
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary mx-auto">
              <span className="text-lg font-bold text-primary-foreground">G</span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
              isCollapsed && "mx-auto mt-4"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed && "mx-auto")} />
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            )}
            title={isCollapsed ? (theme === "light" ? "Modo Escuro" : "Modo Claro") : undefined}
          >
            {theme === "light" ? (
              <>
                <Moon className={cn("h-5 w-5", isCollapsed && "mx-auto")} />
                {!isCollapsed && <span>Modo Escuro</span>}
              </>
            ) : (
              <>
                <Sun className={cn("h-5 w-5", isCollapsed && "mx-auto")} />
                {!isCollapsed && <span>Modo Claro</span>}
              </>
            )}
          </button>

          <button
            onClick={() => navigate("/ia-config")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            )}
            title={isCollapsed ? "Configurações" : undefined}
          >
            <Settings className={cn("h-5 w-5", isCollapsed && "mx-auto")} />
            {!isCollapsed && <span>Configurações</span>}
          </button>

          <button
            onClick={handleSignOut}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
              "text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            )}
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className={cn("h-5 w-5", isCollapsed && "mx-auto")} />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">G</span>
          </div>
          <h1 className="text-lg font-semibold">
            <span className="text-foreground">GetMore</span>
            <span className="text-primary"> AI</span>
          </h1>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed right-0 top-14 bottom-0 w-72 bg-card/95 backdrop-blur-xl border-l border-border z-50 flex flex-col"
            >
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-border space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {theme === "light" ? (
                    <>
                      <Moon className="h-5 w-5" />
                      <span>Modo Escuro</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-5 w-5" />
                      <span>Modo Claro</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation - Quick Access */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/90 backdrop-blur-xl border-t border-border flex items-center justify-around z-40 safe-area-pb">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-colors min-w-[56px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
