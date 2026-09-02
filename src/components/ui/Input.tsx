import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      error,
      leftIcon,
      rightIcon,
      showPasswordToggle = type === "password",
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const hasPasswordToggle = isPassword && showPasswordToggle;
    const effectiveType = hasPasswordToggle ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={effectiveType}
          disabled={disabled}
          className={cn(
            "w-full h-9 bg-surface-1 border border-border-default rounded-xl px-3 text-sm text-text-primary placeholder:text-text-muted",
            "transition-colors duration-150",
            "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            leftIcon && "pl-9",
            (rightIcon || hasPasswordToggle) && "pr-9",
            error && "border-danger-solid focus:border-danger-solid focus:ring-danger-solid",
            className
          )}
          {...props}
        />
        {hasPasswordToggle ? (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors cursor-pointer p-0.5 rounded focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            title={showPassword ? "Hide password" : "Show password"}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        ) : (
          rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted flex items-center justify-center">
              {rightIcon}
            </div>
          )
        )}
        {error && (
          <p className="mt-1 text-2xs text-danger-text font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
