import { useEffect } from "react";
import { Command } from "cmdk";
import {
  KeyRound,
  FileText,
  CreditCard,
  User,
  Plus,
  Lock,
  Sparkles,
  Search,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import type { ItemSummary } from "@/lib/types";

interface CommandPaletteProps {
  items: ItemSummary[];
  onSelectItem: (id: string) => void;
  onLockVault: () => void;
}

export function CommandPalette({
  items,
  onSelectItem,
  onLockVault,
}: CommandPaletteProps) {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    openCreateItemModal,
    setGeneratorOpen,
  } = useAppStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />

      <div className="relative w-full max-w-lg bg-surface-1 border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        <Command className="w-full" loop>
          <div className="flex items-center px-4 border-b border-border-subtle bg-surface-2/50">
            <Search className="w-4 h-4 text-text-muted mr-3 shrink-0" />
            <Command.Input
              placeholder="Search items, categories, or actions (⌘K)..."
              className="w-full h-12 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              autoFocus
            />
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-6 text-center text-xs text-text-muted">
              No results found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group
              heading="Actions"
              className="text-2xs font-semibold text-text-muted px-2 py-1 uppercase tracking-wider"
            >
              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  openCreateItemModal("login");
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-primary rounded-xl hover:bg-surface-2 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4 text-accent" />
                <span>Add New Login</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  setGeneratorOpen(true);
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-primary rounded-xl hover:bg-surface-2 cursor-pointer transition-colors"
              >
                <Sparkles className="w-4 h-4 text-warning-text" />
                <span>Password & Passphrase Generator</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  onLockVault();
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-danger-text rounded-xl hover:bg-danger-surface cursor-pointer transition-colors"
              >
                <Lock className="w-4 h-4" />
                <span>Lock Vault Immediately (⌘L)</span>
              </Command.Item>
            </Command.Group>

            {/* Vault Items */}
            {items.length > 0 && (
              <Command.Group
                heading="Vault Items"
                className="text-2xs font-semibold text-text-muted px-2 py-1 uppercase tracking-wider mt-2"
              >
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.title} ${item.subtitle || ""}`}
                    onSelect={() => {
                      setCommandPaletteOpen(false);
                      onSelectItem(item.id);
                    }}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium text-text-primary rounded-xl hover:bg-surface-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.item_type === "login" && <KeyRound className="w-4 h-4 text-accent" />}
                      {item.item_type === "secure_note" && <FileText className="w-4 h-4 text-warning-text" />}
                      {item.item_type === "credit_card" && <CreditCard className="w-4 h-4 text-success-text" />}
                      {item.item_type === "identity" && <User className="w-4 h-4 text-info-text" />}
                      <span className="truncate">{item.title}</span>
                    </div>
                    {item.subtitle && (
                      <span className="text-2xs text-text-muted truncate ml-2">
                        {item.subtitle}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
