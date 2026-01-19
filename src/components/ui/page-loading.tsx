"use client";

import { Spinner } from "./ios-spinner";
import { motion, AnimatePresence } from "framer-motion";

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" className="text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
