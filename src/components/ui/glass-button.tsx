import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "relative isolate cursor-pointer rounded-full transition-all duration-300 font-medium",
  {
    variants: {
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
        icon: "h-10 w-10",
      },
      variant: {
        default: "",
        primary: "",
        ghost: "",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

const glassButtonTextVariants = cva(
  "relative block select-none tracking-tight",
  {
    variants: {
      size: {
        default: "px-5 py-2.5",
        sm: "px-4 py-2",
        lg: "px-7 py-3",
        icon: "flex h-10 w-10 items-center justify-center",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  contentClassName?: string;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, size, variant, contentClassName, ...props }, ref) => {
    const isPrimary = variant === "primary";
    const isGhost = variant === "ghost";

    return (
      <button
        ref={ref}
        className={cn(
          glassButtonVariants({ size, variant }),
          "group",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            glassButtonTextVariants({ size }),
            "relative z-10 flex items-center justify-center gap-2",
            isPrimary
              ? "text-primary-foreground"
              : isGhost
              ? "text-foreground"
              : "text-foreground",
            contentClassName
          )}
        >
          {children}
        </span>
        <span
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-300",
            isPrimary
              ? "bg-primary shadow-primary group-hover:bg-primary/90"
              : isGhost
              ? "bg-transparent group-hover:bg-muted/50"
              : "bg-card/60 backdrop-blur-md border border-border/50 group-hover:bg-card/80 group-hover:border-border"
          )}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            isPrimary
              ? "shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
              : "shadow-[0_0_15px_hsl(var(--foreground)/0.1)]"
          )}
        />
      </button>
    );
  }
);
GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };
