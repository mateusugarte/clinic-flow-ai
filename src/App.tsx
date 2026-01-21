import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Agendas from "./pages/Agendas";
import CRM from "./pages/CRM";
import Clientes from "./pages/Clientes";
import Servicos from "./pages/Servicos";
import IAConfig from "./pages/IAConfig";
import Relatorios from "./pages/Relatorios";
import NutricaoConfirmacao from "./pages/NutricaoConfirmacao";
import FollowUp from "./pages/FollowUp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/agendas" element={<Agendas />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/servicos" element={<Servicos />} />
                <Route path="/ia-config" element={<IAConfig />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/nutricao-confirmacao" element={<NutricaoConfirmacao />} />
                <Route path="/follow-up" element={<FollowUp />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
