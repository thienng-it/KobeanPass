import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={cn(
          "relative w-full bg-surface-1 border border-border-default/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden",
          "transform transition-all duration-200 scale-100 opacity-100 flex flex-col max-h-[90vh]",
          maxWidth === "sm" && "max-w-md",
          maxWidth === "md" && "max-w-xl",
          maxWidth === "lg" && "max-w-2xl",
          maxWidth === "xl" && "max-w-3xl",
          maxWidth === "2xl" && "max-w-4xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-border-subtle bg-surface-2/40">
          <div>
            <h3 className="text-lg font-bold text-text-primary tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs sm:text-sm text-text-muted mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-7 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
