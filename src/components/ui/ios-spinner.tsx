"use client"

import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  return (
    <div
      className={cn(
        "relative",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-0 w-[8%] h-[26%] bg-current rounded-full origin-[center_180%]"
          style={{
            transform: `rotate(${i * 30}deg)`,
            animationDelay: `${-1.1 + i * 0.1}s`,
            animation: "spinner-blade 1s linear infinite",
            opacity: 0.25,
          }}
        />
      ))}
    </div>
  )
}
