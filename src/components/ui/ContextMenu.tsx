import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface ContextMenuItem {
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
  variant?: "default" | "danger";
  divider?: boolean;
  disabled?: boolean;
}

export interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  items: ContextMenuItem[];
}

export function ContextMenu({ isOpen, position, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && position) {
      // Calculate viewport boundary adjustments
      const menuWidth = 220;
      const menuHeight = items.length * 36 + 20;

      let x = position.x;
      let y = position.y;

      if (x + menuWidth > window.innerWidth - 10) {
        x = Math.max(10, window.innerWidth - menuWidth - 10);
      }
      if (y + menuHeight > window.innerHeight - 10) {
        y = Math.max(10, window.innerHeight - menuHeight - 10);
      }

      setCoords({ x, y });
    }
  }, [isOpen, position, items]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  return (
    <div
      ref={menuRef}
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      className="fixed z-50 min-w-[200px] max-w-[280px] bg-surface-1/98 backdrop-blur-xl border border-border-default/90 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <div className="space-y-0.5">
        {items.map((item, index) => {
          if (item.divider) {
            return (
              <div
                key={`divider-${index}`}
                className="my-1 border-t border-border-subtle"
              />
            );
          }

          const isDanger = item.variant === "danger";

          return (
            <button
              key={item.label || index}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.onClick?.();
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left group",
                isDanger
                  ? "text-danger-text hover:bg-danger-surface hover:text-danger-text"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2",
                item.disabled && "opacity-50 pointer-events-none cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {item.icon && (
                  <span
                    className={cn(
                      "w-4 h-4 flex items-center justify-center shrink-0",
                      isDanger
                        ? "text-danger-text"
                        : "text-text-muted group-hover:text-text-primary"
                    )}
                  >
                    {item.icon}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
              </div>

              {item.shortcut && (
                <span className="text-3xs font-mono text-text-muted ml-3 shrink-0">
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
