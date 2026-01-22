import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { z } from "zod";
import logoIcon from "@/assets/logo-g.png";

const authSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [mounted, setMounted] = useState(false);
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === "email") fieldErrors.email = err.message;
          if (err.path[0] === "password") fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao entrar",
            description: error.message.includes("Invalid login credentials") 
              ? "Email ou senha incorretos" 
              : error.message,
          });
        } else {
          toast({ title: "Bem-vindo!", description: "Login realizado com sucesso" });
          navigate("/dashboard");
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao cadastrar",
            description: error.message.includes("already registered") 
              ? "Este email já está cadastrado" 
              : error.message,
          });
        } else {
          toast({ title: "Cadastro realizado!", description: "Verifique seu email para confirmar a conta" });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F5F1]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F8F5F1] overflow-hidden">
      {/* Left Panel - Decorative */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#b60259] via-[#8a0245] to-[#47001e] overflow-hidden"
      >
        {/* Abstract shapes */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 5, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/5 blur-3xl"
          />
          <motion.div
            animate={{ 
              y: [0, 30, 0],
              rotate: [0, -5, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-40 right-10 w-80 h-80 rounded-full bg-white/5 blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/3 blur-3xl"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center w-24 h-24 rounded-full bg-[#F8F5F1] shadow-xl"
          >
            <img src={logoIcon} alt="stickIA" className="h-16 w-16 object-contain" />
          </motion.div>
          
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-5xl lg:text-7xl font-light text-white tracking-[-0.02em]">
                  stick<span className="font-semibold">AI</span>
                </h1>
                <div className="w-12 h-[1px] bg-white/30" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/50 font-medium">
                Intelligent Practice Management
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="space-y-4 max-w-sm"
            >
              <p className="text-xl text-white/90 font-light leading-relaxed tracking-tight">
                Inteligência artificial que transforma sua clínica em uma 
                <span className="text-white font-medium"> máquina de resultados</span>.
              </p>
              <p className="text-sm text-white/40 font-light leading-relaxed">
                Automatize agendamentos, reduza no-shows e aumente seu faturamento com decisões orientadas por dados.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-3 text-white/30 text-xs tracking-wide"
          >
            <span className="w-8 h-[1px] bg-white/20" />
            <span className="uppercase tracking-[0.2em]">AI-Powered</span>
          </motion.div>
        </div>

        {/* Geometric lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <motion.line
            x1="0" y1="100%" x2="100%" y2="0"
            stroke="white" strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
          />
          <motion.line
            x1="20%" y1="100%" x2="100%" y2="20%"
            stroke="white" strokeWidth="0.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.7 }}
          />
        </svg>
      </motion.div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-xl"
            >
              <img src={logoIcon} alt="stickIA" className="h-16 w-16 object-contain" />
            </motion.div>
          </div>

          <div className="text-center mb-12">
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-light text-[#2D2420] tracking-tight"
            >
              {isLogin ? "Bem-vindo de volta" : "Comece agora"}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-[#8B7355]/70 mt-2 font-light"
            >
              {isLogin ? "Acesse sua conta para continuar" : "Crie sua conta em segundos"}
            </motion.p>
          </div>

          <motion.form 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onSubmit={handleSubmit} 
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-[#5C4A3A]">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A89080]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-white border-[#E5DDD3] text-[#2D2420] placeholder:text-[#C4B8A8] focus:border-primary focus:ring-primary/10 rounded-xl transition-all duration-200"
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-red-500"
                  >
                    {errors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-[#5C4A3A]">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A89080]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-white border-[#E5DDD3] text-[#2D2420] placeholder:text-[#C4B8A8] focus:border-primary focus:ring-primary/10 rounded-xl transition-all duration-200"
                />
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-red-500"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full h-12 bg-gradient-to-r from-[#b60259] to-[#47001e] hover:from-[#9c024c] hover:to-[#380018] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-primary/30"
            >
              {isLoading ? (
                <motion.div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <>
                  {isLogin ? "Entrar" : "Criar conta"}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </motion.button>
          </motion.form>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-[#8B7355] hover:text-primary transition-colors"
            >
              {isLogin ? (
                <>Não tem conta? <span className="font-medium text-primary">Criar agora</span></>
              ) : (
                <>Já tem conta? <span className="font-medium text-primary">Entrar</span></>
              )}
            </button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 flex items-center justify-center gap-8 text-[10px] uppercase tracking-[0.15em] text-[#A89080]/60"
          >
            <span>Criptografado</span>
            <span className="w-[3px] h-[3px] rounded-full bg-[#D4C8B8]" />
            <span>LGPD</span>
            <span className="w-[3px] h-[3px] rounded-full bg-[#D4C8B8]" />
            <span>99.9% Uptime</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
