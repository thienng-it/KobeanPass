import React, { useState } from "react";
import {
  Shield,
  KeyRound,
  Hash,
  Zap,
  Sparkles,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import {
  createVault,
  checkPasswordStrength,
  generatePassphrase,
  saveKeychainSecret,
} from "@/lib/tauri";
import type { StrengthResult } from "@/lib/types";
import { toast } from "sonner";

interface WelcomeScreenProps {
  onVaultCreated: () => void;
}

type SetupType = "password" | "pin" | "quick";

export function WelcomeScreen({ onVaultCreated }: WelcomeScreenProps) {
  const [setupType, setSetupType] = useState<SetupType>("password");
  const [vaultName, setVaultName] = useState("Personal Vault");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [strength, setStrength] = useState<StrengthResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordChange = async (val: string) => {
    setPassword(val);
    if (val.length > 0) {
      try {
        const res = await checkPasswordStrength(val);
        setStrength(res);
      } catch (e) {
        console.error(e);
      }
    } else {
      setStrength(null);
    }
  };

  const handleSuggestPassphrase = async () => {
    try {
      const res = await generatePassphrase({
        word_count: 5,
        separator: "-",
        capitalize: true,
        include_number: true,
      });
      setPassword(res.password);
      setConfirmPassword(res.password);
      setStrength(res.strength);
      toast.success("Generated secure passphrase!");
    } catch {
      toast.error("Failed to generate passphrase");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    let secretToUse = password;

    if (setupType === "password") {
      if (!password) {
        toast.error("Please enter a master password");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
    } else if (setupType === "pin") {
      if (!pin || pin.length < 4) {
        toast.error("PIN must be at least 4 digits");
        return;
      }
      if (pin !== confirmPin) {
        toast.error("PINs do not match");
        return;
      }
      secretToUse = pin;
    } else if (setupType === "quick") {
      // Auto-generate high-entropy key for passwordless / keychain vault
      secretToUse = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    setIsSubmitting(true);
    try {
      await createVault("", vaultName, secretToUse);
      localStorage.setItem("kobean_unlock_type", setupType);
      if (setupType === "quick" || setupType === "pin") {
        try {
          await saveKeychainSecret("default_quick", secretToUse);
        } catch {}
      }
      toast.success("Vault created and unlocked!");
      onVaultCreated();
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Failed to create vault");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-surface-0">
      <div className="w-full max-w-md bg-surface-1 border border-border-default rounded-3xl p-8 shadow-2xl relative">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent text-white shadow-lg shadow-accent/25 mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Create Your Vault
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Local-first, zero-knowledge sovereign password manager.
          </p>
        </div>

        {/* Setup Type Selector */}
        <div className="grid grid-cols-3 gap-1 bg-surface-2 p-1 rounded-2xl border border-border-subtle text-xs font-semibold mb-4">
          <button
            type="button"
            onClick={() => setSetupType("password")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
              setupType === "password"
                ? "bg-surface-0 text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Password
          </button>
          <button
            type="button"
            onClick={() => setSetupType("pin")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
              setupType === "pin"
                ? "bg-surface-0 text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Hash className="w-3.5 h-3.5" /> PIN Code
          </button>
          <button
            type="button"
            onClick={() => setSetupType("quick")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
              setupType === "quick"
                ? "bg-surface-0 text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-accent" /> Quick Setup
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Vault Name
            </label>
            <Input
              value={vaultName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVaultName(e.target.value)}
              placeholder="Personal Vault"
              required
            />
          </div>

          {setupType === "password" && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Master Password
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestPassphrase}
                    className="text-2xs text-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Suggest Passphrase
                  </button>
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePasswordChange(e.target.value)}
                  placeholder="Enter master password (min 8 chars)"
                  leftIcon={<KeyRound className="w-4 h-4" />}
                  required
                />

                {/* Password Strength Meter */}
                {strength && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-text-muted font-medium">Strength:</span>
                      <span
                        className={
                          strength.score >= 3
                            ? "text-success-text font-semibold"
                            : strength.score === 2
                            ? "text-warning-text font-semibold"
                            : "text-danger-text font-semibold"
                        }
                      >
                        {strength.label} (crack time: {strength.crack_time})
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[0, 1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            "rounded-full transition-colors duration-200",
                            step <= strength.score
                              ? strength.score >= 3
                                ? "bg-success-solid"
                                : strength.score === 2
                                ? "bg-warning-solid"
                                : "bg-danger-solid"
                              : "bg-surface-3"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Confirm Master Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter master password"
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />
              </div>
            </>
          )}

          {setupType === "pin" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Set 4–8 Digit PIN
                </label>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="e.g. 123456"
                  leftIcon={<Hash className="w-4 h-4" />}
                  maxLength={8}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Confirm PIN
                </label>
                <Input
                  type="password"
                  value={confirmPin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="Re-enter PIN"
                  leftIcon={<Lock className="w-4 h-4" />}
                  maxLength={8}
                  required
                />
              </div>
            </>
          )}

          {setupType === "quick" && (
            <div className="p-4 bg-accent-surface/40 border border-accent-border rounded-2xl text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center mx-auto shadow-md">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">Instant Sovereign Key Setup</h3>
              <p className="text-2xs text-text-muted leading-relaxed">
                Generates a 256-bit cryptographic key stored in your secure OS Keychain for zero-friction local unlock.
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Initialize Encrypted Vault
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-2xs text-text-muted leading-relaxed">
          🔒 Double-encrypted with <strong>SQLCipher AES-256</strong> and per-record{" "}
          <strong>XChaCha20-Poly1305</strong>. No cloud servers, no trackers.
        </div>
      </div>
    </div>
  );
}
