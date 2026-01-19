import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { z } from "zod";
import logo from "@/assets/logo.png";

const authSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

// Floating orb component for background effect
const FloatingOrb = ({ delay, duration, size, x, y }: { delay: number; duration: number; size: number; x: string; y: string }) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      width: size,
      height: size,
      left: x,
      top: y,
      background: "radial-gradient(circle, rgba(160, 16, 16, 0.15) 0%, rgba(80, 8, 8, 0.05) 50%, transparent 70%)",
      filter: "blur(40px)",
    }}
    animate={{
      y: [0, -30, 0, 30, 0],
      x: [0, 20, 0, -20, 0],
      scale: [1, 1.1, 1, 0.95, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

export default function Auth() {
  const [showLogin, setShowLogin] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  // Loading progress animation
  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);
      return () => clearInterval(interval);
    } else {
      if (loadingProgress > 0) {
        setLoadingProgress(100);
        setTimeout(() => setLoadingProgress(0), 300);
      }
    }
  }, [isLoading]);

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
          if (error.message.includes("Invalid login credentials")) {
            toast({
              variant: "destructive",
              title: "Erro ao entrar",
              description: "Email ou senha incorretos",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Erro ao entrar",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "Bem-vindo!",
            description: "Login realizado com sucesso",
          });
          navigate("/dashboard");
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              variant: "destructive",
              title: "Erro ao cadastrar",
              description: "Este email já está cadastrado",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Erro ao cadastrar",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "Cadastro realizado!",
            description: "Verifique seu email para confirmar a conta",
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0404]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-8 h-8 border-2 border-[#a01010] border-t-transparent rounded-full animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dark red gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0404] via-[#120606] to-[#0a0404]" />
      
      {/* Subtle vignette effect */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      
      {/* Floating orbs - very subtle red glow */}
      <FloatingOrb delay={0} duration={20} size={400} x="10%" y="20%" />
      <FloatingOrb delay={2} duration={25} size={300} x="70%" y="60%" />
      <FloatingOrb delay={4} duration={22} size={350} x="50%" y="10%" />
      <FloatingOrb delay={1} duration={28} size={250} x="80%" y="30%" />
      <FloatingOrb delay={3} duration={24} size={200} x="20%" y="70%" />

      {/* Content */}
      <div className="relative z-10 px-4 w-full max-w-md">
        <AnimatePresence mode="wait">
          {!showLogin ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="text-center space-y-8"
            >
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex justify-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-[#a01010]/20 blur-3xl rounded-full scale-150" />
                  <img src={logo} alt="GetMore" className="h-24 w-24 object-contain relative z-10" />
                </div>
              </motion.div>

              {/* Brand Name */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-2"
              >
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>
                  GetMore<span className="text-[#a01010]">.</span>
                </h1>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40 font-medium">
                  Inteligência Artificial
                </p>
              </motion.div>
              
              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="text-sm text-white/50 max-w-xs mx-auto leading-relaxed"
              >
                Automatize sua clínica e aumente suas conversões com inteligência artificial
              </motion.p>
              
              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <button
                  onClick={() => setShowLogin(true)}
                  className="group relative inline-flex items-center gap-2 px-8 py-3 bg-[#a01010] hover:bg-[#b01515] text-white text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(160,16,16,0.4)]"
                >
                  Acessar Sistema
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <div className="bg-[#0f0808]/80 backdrop-blur-xl border border-white/5 rounded-xl p-8 shadow-2xl">
                {/* Loading Progress Bar */}
                <AnimatePresence>
                  {loadingProgress > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-0 left-0 right-0 h-0.5 bg-white/5 overflow-hidden rounded-t-xl"
                    >
                      <motion.div
                        className="h-full bg-[#a01010]"
                        initial={{ width: 0 }}
                        animate={{ width: `${loadingProgress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Logo in login form */}
                <div className="flex justify-center mb-6">
                  <img src={logo} alt="GetMore" className="h-14 w-14 object-contain" />
                </div>

                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                    {isLogin ? "Entrar" : "Criar conta"}
                  </h2>
                  <p className="text-xs text-white/40 mt-2">
                    {isLogin ? "Acesse sua conta para continuar" : "Crie sua conta para começar"}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs text-white/60">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#a01010]/50 focus:ring-[#a01010]/20"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-400">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs text-white/60">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#a01010]/50 focus:ring-[#a01010]/20"
                      />
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-400">{errors.password}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-[#a01010] hover:bg-[#b01515] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(160,16,16,0.3)]"
                  >
                    {isLoading ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : isLogin ? (
                      "Entrar"
                    ) : (
                      "Criar conta"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    {isLogin ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowLogin(false)}
                      className="text-xs text-white/30 hover:text-white/50 transition-colors"
                    >
                      ← Voltar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}