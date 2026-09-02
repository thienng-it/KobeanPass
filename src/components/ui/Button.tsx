import React from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
          "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          // Variants
          variant === "primary" &&
            "bg-accent text-white hover:bg-accent-hover shadow-sm",
          variant === "secondary" &&
            "bg-surface-2 text-text-primary border border-border-default hover:bg-surface-3",
          variant === "ghost" &&
            "text-text-secondary hover:text-text-primary hover:bg-surface-2",
          variant === "danger" &&
            "bg-danger-surface text-danger-text border border-danger-border hover:bg-danger-solid hover:text-white",
          variant === "outline" &&
            "border border-border-default text-text-primary hover:bg-surface-2",
          // Sizes
          size === "sm" && "h-7 px-2.5 text-xs rounded-lg gap-1.5",
          size === "md" && "h-9 px-3.5 text-sm rounded-xl gap-2",
          size === "lg" && "h-11 px-5 text-base rounded-xl gap-2.5",
          size === "icon" && "h-8 w-8 rounded-lg",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
