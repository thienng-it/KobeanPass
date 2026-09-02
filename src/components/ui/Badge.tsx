import React from "react";
import { cn } from "@/lib/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium select-none",
        size === "sm" && "px-1.5 py-0.5 text-2xs rounded-md gap-1",
        size === "md" && "px-2 py-0.5 text-xs rounded-lg gap-1.5",
        // Variants
        variant === "default" && "bg-surface-3 text-text-secondary border border-border-subtle",
        variant === "accent" && "bg-accent-surface text-accent border border-accent-border",
        variant === "success" && "bg-success-surface text-success-text border border-success-border",
        variant === "warning" && "bg-warning-surface text-warning-text border border-warning-border",
        variant === "danger" && "bg-danger-surface text-danger-text border border-danger-border",
        variant === "info" && "bg-info-surface text-info-text border border-info-border",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
