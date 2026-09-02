import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/stores/appStore";
import {
  changeMasterPassword,
  saveKeychainSecret,
  deleteKeychainSecret,
} from "@/lib/tauri";
import {
  KeyRound,
  Hash,
  Zap,
  ShieldCheck,
  Lock,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UnlockType = "password" | "pin" | "quick";

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, toggleTheme } = useAppStore();
  const [activeTab, setActiveTab] = useState<"security" | "preferences">("security");
  const [currentUnlockType, setCurrentUnlockType] = useState<UnlockType>("password");

  // Form states for changing credentials
  const [targetType, setTargetType] = useState<UnlockType>("password");
  const [currentSecret, setCurrentSecret] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = (localStorage.getItem("kobean_unlock_type") || "password") as UnlockType;
      setCurrentUnlockType(stored);
      setTargetType(stored);
      setCurrentSecret("");
      setNewPassword("");
      setConfirmNewPassword("");
      setNewPin("");
      setConfirmNewPin("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleUpdateUnlockMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let nextSecret = "";

    if (targetType === "password") {
      if (!newPassword || newPassword.length < 8) {
        setErrorMessage("New password must be at least 8 characters");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setErrorMessage("New passwords do not match");
        return;
      }
      nextSecret = newPassword;
    } else if (targetType === "pin") {
      if (!newPin || newPin.length < 4) {
        setErrorMessage("New PIN must be at least 4 digits");
        return;
      }
      if (newPin !== confirmNewPin) {
        setErrorMessage("New PINs do not match");
        return;
      }
      nextSecret = newPin;
    } else if (targetType === "quick") {
      // Generate sovereign key
      nextSecret = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    setIsSubmitting(true);
    try {
      // 1. Rekey database with new secret
      await changeMasterPassword(currentSecret, nextSecret);

      // 2. Update Keychain according to method
      if (targetType === "quick" || targetType === "pin") {
        await saveKeychainSecret("default_quick", nextSecret);
      } else {
        try {
          await deleteKeychainSecret("default_quick");
        } catch {}
      }

      // 3. Save new unlock type in local storage
      localStorage.setItem("kobean_unlock_type", targetType);
      setCurrentUnlockType(targetType);

      toast.success(`Unlock method successfully updated to ${targetType.toUpperCase()}!`);
      onClose();
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "Failed to update unlock method";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      description="Manage vault security, sovereign unlock methods, and preferences"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-border-subtle pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "security"
                ? "bg-surface-3 text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-accent" /> Security & Unlock Type
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "preferences"
                ? "bg-surface-3 text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Clock className="w-4 h-4" /> Preferences & Theme
          </button>
        </div>

        {/* Tab 1: Security & Unlock Type */}
        {activeTab === "security" && (
          <div className="space-y-5">
            {/* Current Method Info */}
            <div className="p-3.5 bg-surface-2 rounded-2xl border border-border-subtle flex items-center justify-between">
              <div>
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Active Unlock Method
                </span>
                <span className="text-sm font-bold text-text-primary flex items-center gap-1.5 mt-0.5 capitalize">
                  {currentUnlockType === "password" && <KeyRound className="w-4 h-4 text-accent" />}
                  {currentUnlockType === "pin" && <Hash className="w-4 h-4 text-accent" />}
                  {currentUnlockType === "quick" && <Zap className="w-4 h-4 text-accent" />}
                  {currentUnlockType === "password" ? "Master Password" : currentUnlockType === "pin" ? "PIN Code" : "Quick Passwordless"}
                </span>
              </div>
              <span className="text-2xs px-2.5 py-1 rounded-lg bg-accent-surface text-accent font-semibold border border-accent-border">
                Enforced on Lock Screen
              </span>
            </div>

            {/* Change Unlock Method Form */}
            <form onSubmit={handleUpdateUnlockMethod} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Select New Unlock Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType("password")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      targetType === "password"
                        ? "bg-accent-surface border-accent text-text-primary shadow-sm ring-1 ring-accent"
                        : "bg-surface-2 border-border-default hover:border-border-strong text-text-secondary"
                    }`}
                  >
                    <KeyRound className="w-4 h-4 text-accent mb-1" />
                    <div className="text-xs font-bold">Password</div>
                    <div className="text-2xs text-text-muted">Full Master Passphrase</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType("pin")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      targetType === "pin"
                        ? "bg-accent-surface border-accent text-text-primary shadow-sm ring-1 ring-accent"
                        : "bg-surface-2 border-border-default hover:border-border-strong text-text-secondary"
                    }`}
                  >
                    <Hash className="w-4 h-4 text-accent mb-1" />
                    <div className="text-xs font-bold">PIN Code</div>
                    <div className="text-2xs text-text-muted">4–8 Digit Numeric PIN</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType("quick")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      targetType === "quick"
                        ? "bg-accent-surface border-accent text-text-primary shadow-sm ring-1 ring-accent"
                        : "bg-surface-2 border-border-default hover:border-border-strong text-text-secondary"
                    }`}
                  >
                    <Zap className="w-4 h-4 text-accent mb-1" />
                    <div className="text-xs font-bold">Quick / None</div>
                    <div className="text-2xs text-text-muted">OS Keychain Instant</div>
                  </button>
                </div>
              </div>

              {/* Current Credential Verification */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  Current Password / PIN (Required to authorize change)
                </label>
                <Input
                  type="password"
                  value={currentSecret}
                  onChange={(e) => setCurrentSecret(e.target.value)}
                  placeholder="Enter your current credential"
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />
              </div>

              {/* Target Type Specific Inputs */}
              {targetType === "password" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                      New Master Password
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      leftIcon={<KeyRound className="w-4 h-4" />}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                      Confirm New Master Password
                    </label>
                    <Input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      leftIcon={<Lock className="w-4 h-4" />}
                      required
                    />
                  </div>
                </>
              )}

              {targetType === "pin" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                      New 4–8 Digit PIN
                    </label>
                    <Input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="e.g. 123456"
                      leftIcon={<Hash className="w-4 h-4" />}
                      maxLength={8}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                      Confirm New PIN
                    </label>
                    <Input
                      type="password"
                      value={confirmNewPin}
                      onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="Re-enter new PIN"
                      leftIcon={<Lock className="w-4 h-4" />}
                      maxLength={8}
                      required
                    />
                  </div>
                </>
              )}

              {targetType === "quick" && (
                <div className="p-3 bg-surface-2 rounded-xl text-xs text-text-muted">
                  Switching to Quick Unlock will store a secure sovereign key inside your device's native Keychain.
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-danger-surface border border-danger-border rounded-xl text-xs text-danger-text">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save Changes
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Preferences */}
        {activeTab === "preferences" && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-2 rounded-2xl border border-border-subtle flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-text-primary">Theme Appearance</h4>
                <p className="text-2xs text-text-muted mt-0.5">Toggle between dark and light appearance mode</p>
              </div>
              <Button variant="secondary" size="sm" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <>
                    <Sun className="w-4 h-4 mr-1.5" /> Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 mr-1.5" /> Dark Mode
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 bg-surface-2 rounded-2xl border border-border-subtle space-y-2">
              <h4 className="text-sm font-bold text-text-primary">Security Invariants</h4>
              <p className="text-2xs text-text-muted leading-relaxed">
                KobeanPass operates with strict zero-knowledge architecture. Secrets are protected in memory with{" "}
                <code>ZeroizeOnDrop</code>, encrypted with <strong>SQLCipher page encryption</strong>, and
                individually enveloped with <strong>XChaCha20-Poly1305</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
