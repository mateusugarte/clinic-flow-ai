"use client";

import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
  },
  exit: {
    opacity: 0,
    y: -4,
    filter: "blur(2px)",
  },
};

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{
        type: "spring" as const,
        stiffness: 260,
        damping: 25,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered children animation wrapper
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({ children, className, staggerDelay = 0.08 }: StaggerContainerProps) {
  const variants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// Fade in animation wrapper
interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export function FadeIn({ 
  children, 
  className, 
  delay = 0, 
  duration = 0.5,
  direction = "up" 
}: FadeInProps) {
  const directionOffset = {
    up: { y: 16 },
    down: { y: -16 },
    left: { x: 16 },
    right: { x: -16 },
    none: {},
  };

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        ...directionOffset[direction],
        filter: "blur(4px)",
      }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        x: 0,
        filter: "blur(0px)",
      }}
      transition={{
        type: "spring" as const,
        stiffness: 200,
        damping: 20,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale fade animation
interface ScaleFadeProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScaleFade({ children, className, delay = 0 }: ScaleFadeProps) {
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        scale: 0.95,
        filter: "blur(4px)",
      }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        filter: "blur(0px)",
      }}
      transition={{
        type: "spring" as const,
        stiffness: 300,
        damping: 25,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}