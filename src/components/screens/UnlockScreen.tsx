import React, { useState, useEffect } from "react";
import {
  Shield,
  KeyRound,
  Zap,
  AlertTriangle,
  ArrowRight,
  Clock,
  Delete,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { openVault, getKeychainSecret } from "@/lib/tauri";
import { toast } from "sonner";

interface UnlockScreenProps {
  onUnlocked: () => void;
  rateLimitedUntil?: number;
}

type UnlockType = "password" | "pin" | "quick";

export function UnlockScreen({ onUnlocked, rateLimitedUntil }: UnlockScreenProps) {
  const [unlockType, setUnlockType] = useState<UnlockType>("password");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [remainingCooldown, setRemainingCooldown] = useState<number>(0);

  useEffect(() => {
    const stored = (localStorage.getItem("kobean_unlock_type") || "password") as UnlockType;
    setUnlockType(stored);
  }, []);

  useEffect(() => {
    if (rateLimitedUntil) {
      const now = Math.floor(Date.now() / 1000);
      const diff = rateLimitedUntil - now;
      if (diff > 0) {
        setRemainingCooldown(diff);
      }
    }
  }, [rateLimitedUntil]);

  useEffect(() => {
    if (remainingCooldown > 0) {
      const interval = setInterval(() => {
        setRemainingCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [remainingCooldown]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState("CapsLock"));
  };

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Please enter master password");
      return;
    }

    setIsSubmitting(true);
    try {
      await openVault("", password);
      toast.success("Vault unlocked!");
      onUnlocked();
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "Failed to unlock";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      toast.error("Please enter your PIN");
      return;
    }

    setIsSubmitting(true);
    try {
      await openVault("", pin);
      toast.success("Vault unlocked!");
      onUnlocked();
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "Incorrect PIN";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickUnlock = async () => {
    setIsSubmitting(true);
    try {
      const storedSecret = await getKeychainSecret("default_quick");
      if (storedSecret) {
        await openVault("", storedSecret);
        toast.success("Vault unlocked!");
        onUnlocked();
        return;
      }
      // If no stored secret, try empty
      await openVault("", "");
      toast.success("Vault unlocked!");
      onUnlocked();
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "Quick Unlock failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
    }
  };

  const handlePinDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleBackdropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const style = event.currentTarget.style;

    style.setProperty("--cursor-x", `${event.clientX - bounds.left}px`);
    style.setProperty("--cursor-y", `${event.clientY - bounds.top}px`);
    style.setProperty("--cursor-active", "1");
  };

  const handleBackdropPointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--cursor-active", "0");
  };

  return (
    <div
      className="unlock-backdrop min-h-screen w-full flex items-center justify-center p-8"
      onPointerMove={handleBackdropPointerMove}
      onPointerLeave={handleBackdropPointerLeave}
    >
      <div className="relative z-10 w-full max-w-lg bg-surface-1 border border-border-default/90 rounded-[2.5rem] p-10 md:p-12 shadow-2xl text-center">
        {/* Shield Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-surface-2 border border-border-strong text-accent shadow-lg mb-6">
          <Shield className="w-10 h-10" />
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight mb-2">
          KobeanPass Locked
        </h1>
        <p className="text-sm md:text-base text-text-muted mb-8 leading-relaxed">
          {unlockType === "password" && "Enter master password to access your credentials."}
          {unlockType === "pin" && "Enter your PIN code to unlock the vault."}
          {unlockType === "quick" && "Use Quick Unlock to access your credentials."}
        </p>

        {remainingCooldown > 0 ? (
          <div className="bg-danger-surface border border-danger-border rounded-2xl p-5 text-center space-y-2 mb-6">
            <div className="inline-flex items-center gap-2 text-danger-text font-bold text-sm">
              <Clock className="w-5 h-5" /> Rate Limit Active
            </div>
            <p className="text-xs text-danger-text/90">
              Too many failed attempts. Try again in <strong>{remainingCooldown}s</strong>.
            </p>
          </div>
        ) : (
          <>
            {/* 1. Master Password Form */}
            {unlockType === "password" && (
              <form onSubmit={handlePasswordUnlock} className="space-y-5 text-left">
                <div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyDown}
                    placeholder="Master password"
                    leftIcon={<KeyRound className="w-5 h-5" />}
                    autoFocus
                    required
                    className="h-13 text-base md:text-lg pl-11 pr-11 rounded-2xl"
                  />

                  {isCapsLockOn && (
                    <div className="flex items-center gap-2 mt-2.5 text-xs text-warning-text bg-warning-surface border border-warning-border rounded-xl px-3 py-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Caps Lock is ON</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full h-13 text-base md:text-lg font-bold rounded-2xl shadow-lg shadow-accent/25"
                  isLoading={isSubmitting}
                >
                  Unlock Vault <ArrowRight className="w-5 h-5 ml-1.5" />
                </Button>
              </form>
            )}

            {/* 2. PIN Code Form */}
            {unlockType === "pin" && (
              <div className="space-y-5">
                {/* PIN Display Dots */}
                <div className="flex items-center justify-center gap-3 py-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`w-4.5 h-4.5 rounded-full border-2 transition-all duration-150 ${
                        pin.length > idx
                          ? "bg-accent border-accent scale-110 shadow-sm"
                          : "bg-surface-2 border-border-default"
                      }`}
                    />
                  ))}
                </div>

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handlePinDigit(d)}
                      className="h-13 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border-subtle text-lg font-extrabold text-text-primary active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPin("")}
                    className="h-13 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border-subtle text-xs font-semibold text-text-muted active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinDigit("0")}
                    className="h-13 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border-subtle text-lg font-extrabold text-text-primary active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handlePinDelete}
                    className="h-13 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border-subtle text-text-muted hover:text-danger-text active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full h-13 text-base font-bold rounded-2xl mt-2 shadow-lg shadow-accent/25"
                  onClick={() => handlePinUnlock()}
                  isLoading={isSubmitting}
                  disabled={pin.length === 0}
                >
                  Unlock with PIN <ArrowRight className="w-5 h-5 ml-1.5" />
                </Button>
              </div>
            )}

            {/* 3. Quick Unlock */}
            {unlockType === "quick" && (
              <div className="space-y-5 py-2">
                <div className="p-5 bg-accent-surface/40 border border-accent-border rounded-2xl text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center mx-auto shadow-md">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary">Instant Quick Unlock</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Sovereign keychain authentication configured for this device.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full h-13 text-base font-bold rounded-2xl shadow-lg shadow-accent/25"
                  onClick={handleQuickUnlock}
                  isLoading={isSubmitting}
                >
                  <Zap className="w-5 h-5 mr-2" /> Unlock Now
                </Button>
              </div>
            )}
          </>
        )}

        <div className="mt-8 text-center text-xs text-text-muted font-medium">
          ⌘K to search commands &bull; ⌘L to lock
        </div>
      </div>
    </div>
  );
}
