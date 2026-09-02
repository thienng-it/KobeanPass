import React, { useState, useRef, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { parseTotpUri } from "@/lib/tauri";
import { decodeQrFromImage, readClipboardForTotp } from "@/lib/qr";
import type { TotpConfig } from "@/lib/types";
import {
  Link as LinkIcon,
  AlertCircle,
  QrCode,
  ClipboardPaste,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanned: (config: TotpConfig) => void;
}

export function QrScannerModal({ isOpen, onClose, onScanned }: QrScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [rawUriInput, setRawUriInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTabChange = (tab: "upload" | "manual") => {
    setErrorMessage(null);
    setActiveTab(tab);
  };

  // Process decoded QR text or otpauth URL
  const handleDecodedString = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setIsProcessing(true);
      setErrorMessage(null);

      try {
        if (trimmed.startsWith("otpauth://")) {
          const config = await parseTotpUri(trimmed);
          toast.success(`TOTP imported for ${config.issuer || config.account || "item"}`);
          onScanned(config);
          onClose();
        } else {
          // Clean base32 secret
          const cleanSecret = trimmed.replace(/[\s-]+/g, "").toUpperCase();
          if (cleanSecret.length < 16) {
            throw new Error("Secret key is too short. Minimum 16 characters required.");
          }
          const config: TotpConfig = {
            secret: cleanSecret,
            digits: 6,
            period: 30,
            algorithm: "SHA1",
          };
          toast.success("TOTP secret key recognized!");
          onScanned(config);
          onClose();
        }
      } catch (err: any) {
        setErrorMessage(
          typeof err === "string" ? err : err?.message || "Invalid QR code or TOTP URI"
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [onScanned, onClose]
  );

  // Handle image file or blob
  const processImageBlob = async (blob: Blob | File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const decoded = await decodeQrFromImage(blob);
      if (decoded) {
        await handleDecodedString(decoded);
      } else {
        setErrorMessage("No QR code found in this image. Please ensure the QR code is clearly visible.");
      }
    } catch (err: any) {
      setErrorMessage(typeof err === "string" ? err : "Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle 1-click clipboard paste
  const handlePasteFromClipboard = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await readClipboardForTotp();
      if (result) {
        await handleDecodedString(result.data);
      } else {
        setErrorMessage("No QR code screenshot, otpauth URL, or 2FA key found in clipboard. Press ⇧⌘4 (Mac) or Win+Shift+S (Windows) to capture a screenshot of the QR code first.");
      }
    } catch {
      setErrorMessage("Could not read clipboard. Please paste directly or drag an image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Global paste handler when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            await processImageBlob(blob);
            return;
          }
        }
      }

      const text = e.clipboardData?.getData("text");
      if (text && (text.startsWith("otpauth://") || text.length >= 16)) {
        e.preventDefault();
        await handleDecodedString(text);
      }
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, [isOpen, handleDecodedString]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawUriInput.trim()) return;
    await handleDecodedString(rawUriInput);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setErrorMessage(null);
        onClose();
      }}
      title="Set Up 2FA Authenticator"
      description="Import your 2FA secret from a screenshot, clipboard, image, or setup key"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Tab Selection */}
        <div className="flex gap-1.5 p-1 bg-surface-2 rounded-2xl border border-border-subtle text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleTabChange("upload")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "upload"
                ? "bg-surface-0 text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-accent" /> Screenshot / Paste
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("manual")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-surface-0 text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" /> Text Key / URI
          </button>
        </div>

        {/* Tab 1: Screenshot & Paste Image */}
        {activeTab === "upload" && (
          <div className="space-y-3">
            {/* Quick 1-Click Paste Action */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-md shadow-accent/15"
              onClick={handlePasteFromClipboard}
              isLoading={isProcessing}
            >
              <ClipboardPaste className="w-4 h-4 mr-1.5" /> Paste from Clipboard (⌘V)
            </Button>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  await processImageBlob(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer ${
                isDragOver
                  ? "border-accent bg-accent-surface/30"
                  : "border-border-default hover:border-accent/60 bg-surface-2/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    await processImageBlob(e.target.files[0]);
                  }
                }}
              />
              <div className="w-10 h-10 rounded-2xl bg-accent-surface text-accent flex items-center justify-center mx-auto mb-2 border border-accent-border">
                <QrCode className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-text-primary">
                Or drag & drop QR image file here
              </p>
              <p className="text-2xs text-text-muted mt-1">
                Click to browse files (PNG, JPEG, WebP)
              </p>
            </div>

            {/* Instructions box */}
            <div className="p-3 bg-surface-2 rounded-xl border border-border-subtle text-2xs text-text-muted space-y-1">
              <div className="font-semibold text-text-primary flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent" /> How to scan a QR code on your computer:
              </div>
              <div>
                1. Take a screenshot of the QR code on your screen: <kbd className="px-1 py-0.5 rounded bg-surface-3 border text-text-primary">⇧⌘4</kbd> (Mac) or <kbd className="px-1 py-0.5 rounded bg-surface-3 border text-text-primary">Win+Shift+S</kbd> (Windows).
              </div>
              <div>
                2. Click <strong>Paste from Clipboard</strong> above (or press <kbd className="px-1 py-0.5 rounded bg-surface-3 border text-text-primary">⌘V</kbd>).
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Text / URI */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Paste 2FA Key or otpauth:// Link
              </label>
              <Input
                value={rawUriInput}
                onChange={(e) => setRawUriInput(e.target.value)}
                placeholder="e.g. JBSWY3DPEHPK3PXP or otpauth://totp/..."
                autoFocus
              />
              <p className="text-2xs text-text-muted mt-1">
                Most websites provide a text setup key right below the QR code (click "Can't scan QR code?").
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isProcessing}
              disabled={!rawUriInput.trim()}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Parse & Apply Key
            </Button>
          </form>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-danger-surface border border-danger-border rounded-xl text-xs text-danger-text">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border-subtle">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setErrorMessage(null);
              onClose();
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
