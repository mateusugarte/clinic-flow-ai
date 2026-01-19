"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "relative flex flex-col h-[100vh] items-center justify-center bg-background text-foreground transition-bg",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={cn(
              `
            [--aurora-gradient:repeating-linear-gradient(100deg,hsl(var(--primary))_10%,hsl(var(--primary)/0.8)_15%,hsl(var(--primary)/0.4)_20%,hsl(var(--primary)/0.6)_25%,hsl(var(--primary)/0.3)_30%)]
            [background-image:var(--aurora-gradient)]
            dark:[background-image:var(--aurora-gradient)]
            [background-size:300%,_200%]
            [background-position:50%_50%,50%_50%]
            filter blur-[10px] invert-0
            after:content-[""] after:absolute after:inset-0 
            after:[background-image:var(--aurora-gradient)]
            after:dark:[background-image:var(--aurora-gradient)]
            after:[background-size:200%,_100%]
            after:animate-aurora after:[background-attachment:fixed] after:mix-blend-overlay
            pointer-events-none
            absolute -inset-[10px] opacity-40 will-change-transform`,
              showRadialGradient &&
                `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`
            )}
          ></div>
        </div>
        {children}
      </div>
    </main>
  );
};
