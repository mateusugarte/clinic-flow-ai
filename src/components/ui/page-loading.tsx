"use client";

import { motion, AnimatePresence } from "framer-motion";
import logoIcon from "@/assets/logo-icon.png";

interface PageLoadingProps {
  isLoading: boolean;
}

export function PageLoading({ isLoading }: PageLoadingProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
        >
          <div className="flex flex-col items-center gap-4">
            {/* Logo with pulsing ring animation */}
            <div className="relative">
              {/* Outer pulsing rings */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.5,
                }}
              />
              
              {/* Logo container with subtle pulse */}
              <motion.div
                className="relative w-16 h-16 rounded-full bg-[#F8F5F1] shadow-lg flex items-center justify-center"
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <img 
                  src={logoIcon} 
                  alt="Carregando" 
                  className="w-10 h-10 object-contain"
                />
              </motion.div>
            </div>
            
            <motion.p 
              className="text-sm text-muted-foreground"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Carregando...
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
