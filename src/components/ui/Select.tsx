import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  footerAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  footerAction,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button - Comfortable, Crisp & Readable */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full h-10 flex items-center justify-between px-3.5 rounded-xl bg-surface-1 border transition-all duration-150 cursor-pointer shadow-xs group ${
          isOpen
            ? "border-accent ring-2 ring-accent/20 bg-surface-2/80"
            : "border-border-default hover:border-border-strong hover:bg-surface-2/50"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedOption?.icon && (
            <div className="w-4.5 h-4.5 text-accent flex items-center justify-center shrink-0">
              {selectedOption.icon}
            </div>
          )}
          <span className="text-sm font-semibold text-text-primary truncate">
            {selectedOption?.label || placeholder}
          </span>
        </div>

        <div className="pl-2 shrink-0 text-text-muted transition-transform duration-200">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-accent" : "group-hover:text-text-primary"
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 p-1.5 bg-surface-1/98 backdrop-blur-xl border border-border-default rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100 origin-top overflow-hidden">
          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-100 cursor-pointer text-left group ${
                    isSelected
                      ? "bg-accent-surface text-accent font-semibold"
                      : "hover:bg-surface-2 text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {option.icon && (
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-accent text-white"
                            : "bg-surface-2 text-text-muted group-hover:text-text-primary"
                        }`}
                      >
                        {option.icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-text-muted truncate mt-0.5">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-accent shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {footerAction && (
            <div className="pt-1.5 mt-1 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  footerAction.onClick();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-accent hover:bg-accent-surface transition-colors cursor-pointer"
              >
                {footerAction.icon}
                <span>{footerAction.label}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
