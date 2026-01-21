import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/logo-icon.png";
import logoWordmark from "@/assets/logo-wordmark.png";
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
  Menu,
  X,
  Settings,
  MessageSquareMore,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agendas", label: "Agendas", icon: Calendar },
  { to: "/crm", label: "Kanban", icon: Users },
  { to: "/clientes", label: "Clientes", icon: UserCheck },
  { to: "/servicos", label: "Serviços", icon: Briefcase },
  { to: "/ia-config", label: "IA Config", icon: Bot },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/nutricao-confirmacao", label: "Confirmação", icon: MessageSquareMore },
  { to: "/follow-up", label: "Follow-Up", icon: RefreshCw },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isHovered ? 200 : 56 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "hidden lg:flex fixed left-0 top-0 h-screen flex-col z-50",
          "bg-sidebar border-r border-sidebar-border"
        )}
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-center px-1 py-3 h-24 border-b border-sidebar-border">
          <AnimatePresence mode="wait">
            {isHovered ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <img src={logoIcon} alt="stickIA" className="h-[72px] w-[72px] object-scale-down flex-shrink-0" />
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    delay: 0.05 
                  }}
                  className="overflow-hidden"
                >
                  <img 
                    src={logoWordmark} 
                    alt="stickIA" 
                    className="h-16 object-scale-down"
                  />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mx-auto"
              >
                <img src={logoIcon} alt="stickIA" className="h-[72px] w-[72px] object-scale-down" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors group relative",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <AnimatePresence mode="wait">
                  {isHovered && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap overflow-hidden text-xs"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {!isHovered && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-sidebar-border space-y-0.5">
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            )}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 flex-shrink-0" />
            ) : (
              <Sun className="h-4 w-4 flex-shrink-0" />
            )}
            {isHovered && <span className="text-xs">{theme === "light" ? "Escuro" : "Claro"}</span>}
          </button>

          <button
            onClick={() => navigate("/ia-config")}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            )}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            {isHovered && <span className="text-xs">Config</span>}
          </button>

          <button
            onClick={handleSignOut}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium",
              "text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {isHovered && <span className="text-xs">Sair</span>}
          </button>
        </div>
      </motion.aside>

      {/* Overlay when sidebar is expanded */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden lg:block fixed inset-0 bg-black/20 z-40 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-card border-b border-border flex items-center justify-between px-3 z-40">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="stickIA" className="h-8 w-8 object-contain" />
          <img src={logoWordmark} alt="stickIA" className="h-5 object-contain" />
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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
              className="lg:hidden fixed right-0 top-12 bottom-0 w-56 bg-card border-l border-border z-50 flex flex-col"
            >
              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-border space-y-1">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span>{theme === "light" ? "Modo Escuro" : "Modo Claro"}</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around z-40 safe-area-pb">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded transition-colors min-w-[48px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-2xs font-medium">{item.label.split(" ")[0]}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}