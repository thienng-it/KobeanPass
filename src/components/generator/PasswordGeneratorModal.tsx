import { useState, useEffect } from "react";
import { Copy, RefreshCw, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { generatePassword, generatePassphrase, copySecure } from "@/lib/tauri";
import type { GeneratedPassword } from "@/lib/types";
import { toast } from "sonner";

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordGeneratorModal({ isOpen, onClose }: PasswordGeneratorModalProps) {
  const [mode, setMode] = useState<"password" | "passphrase">("password");
  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);

  // Passphrase options
  const [wordCount, setWordCount] = useState(5);
  const [separator, setSeparator] = useState("-");

  const [result, setResult] = useState<GeneratedPassword | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const regenerate = async () => {
    try {
      if (mode === "password") {
        const res = await generatePassword({
          length,
          uppercase,
          lowercase,
          digits,
          symbols,
          exclude_ambiguous: excludeAmbiguous,
        });
        setResult(res);
      } else {
        const res = await generatePassphrase({
          word_count: wordCount,
          separator,
          capitalize: true,
          include_number: true,
        });
        setResult(res);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      regenerate();
    }
  }, [isOpen, mode, length, uppercase, lowercase, digits, symbols, excludeAmbiguous, wordCount, separator]);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await copySecure(result.password, 30);
      setIsCopied(true);
      toast.success("Copied to clipboard (auto-clears in 30s)!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Password & Passphrase Generator"
      description="Cryptographically random passwords generated entirely on your machine."
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-2 rounded-xl border border-border-subtle">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "password"
                ? "bg-accent text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Random Characters
          </button>
          <button
            type="button"
            onClick={() => setMode("passphrase")}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "passphrase"
                ? "bg-accent text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            EFF Diceware Passphrase
          </button>
        </div>

        {/* Output Box */}
        <div className="p-4 bg-surface-0 border border-border-default rounded-2xl relative group">
          <div className="font-mono text-sm font-semibold tracking-wider text-text-primary break-all pr-16 select-text">
            {result?.password || "Generating..."}
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={regenerate}
              title="Regenerate"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              title="Copy"
              className="p-1.5 rounded-lg text-accent hover:bg-accent-surface transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="w-4 h-4 text-success-text" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Strength & Entropy Metrics */}
        {result && (
          <div className="flex items-center justify-between text-2xs px-1 text-text-muted font-medium">
            <span>
              Entropy: <strong className="text-text-primary">{result.entropy_bits} bits</strong>
            </span>
            <span>
              Strength:{" "}
              <strong
                className={
                  result.strength.score >= 3
                    ? "text-success-text"
                    : result.strength.score === 2
                    ? "text-warning-text"
                    : "text-danger-text"
                }
              >
                {result.strength.label} ({result.strength.crack_time})
              </strong>
            </span>
          </div>
        )}

        {/* Configuration Controls */}
        {mode === "password" ? (
          <div className="space-y-4 pt-2 border-t border-border-subtle">
            <div>
              <div className="flex justify-between text-xs font-semibold text-text-secondary mb-1.5">
                <span>Length: {length}</span>
                <span className="text-2xs text-text-muted">8–64</span>
              </div>
              <input
                type="range"
                min={8}
                max={64}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs text-text-secondary">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uppercase}
                  onChange={(e) => setUppercase(e.target.checked)}
                  className="rounded accent-accent cursor-pointer"
                />
                <span>Uppercase (A–Z)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lowercase}
                  onChange={(e) => setLowercase(e.target.checked)}
                  className="rounded accent-accent cursor-pointer"
                />
                <span>Lowercase (a–z)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={digits}
                  onChange={(e) => setDigits(e.target.checked)}
                  className="rounded accent-accent cursor-pointer"
                />
                <span>Numbers (0–9)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={symbols}
                  onChange={(e) => setSymbols(e.target.checked)}
                  className="rounded accent-accent cursor-pointer"
                />
                <span>Symbols (!@#$)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer col-span-2">
                <input
                  type="checkbox"
                  checked={excludeAmbiguous}
                  onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                  className="rounded accent-accent cursor-pointer"
                />
                <span>Avoid Ambiguous (0, O, 1, l, I)</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2 border-t border-border-subtle">
            <div>
              <div className="flex justify-between text-xs font-semibold text-text-secondary mb-1.5">
                <span>Words: {wordCount}</span>
                <span className="text-2xs text-text-muted">3–10</span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Word Separator
              </label>
              <div className="flex gap-2">
                {["-", "_", ".", " "].map((sep) => (
                  <button
                    key={sep}
                    type="button"
                    onClick={() => setSeparator(sep)}
                    className={`h-8 px-3 rounded-lg border text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      separator === sep
                        ? "bg-accent text-white border-accent"
                        : "bg-surface-2 text-text-secondary border-border-default hover:bg-surface-3"
                    }`}
                  >
                    {sep === " " ? "space" : sep}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="pt-3">
          <Button variant="primary" size="md" className="w-full" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-1.5" /> Copy Securely (Auto-Clears in 30s)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
