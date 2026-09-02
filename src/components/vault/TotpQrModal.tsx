import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getTotpQr, generateTotpQr, copySecure } from "@/lib/tauri";
import { Copy, Check, Eye, EyeOff, QrCode, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface TotpQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  secret?: string;
  title?: string;
  username?: string;
}

export function TotpQrModal({
  isOpen,
  onClose,
  itemId,
  secret,
  title,
  username,
}: TotpQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQrDataUrl(null);
      return;
    }

    let isMounted = true;
    const fetchQr = async () => {
      setIsLoading(true);
      try {
        if (itemId) {
          const dataUrl = await getTotpQr(itemId);
          if (isMounted) setQrDataUrl(dataUrl);
        } else if (secret) {
          const dataUrl = await generateTotpQr({
            secret,
            digits: 6,
            period: 30,
            algorithm: "SHA1",
            issuer: title || "KobeanPass",
            account: username || "Account",
          });
          if (isMounted) setQrDataUrl(dataUrl);
        }
      } catch (err: any) {
        toast.error(typeof err === "string" ? err : "Failed to generate QR code");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchQr();
    return () => {
      isMounted = false;
    };
  }, [isOpen, itemId, secret, title, username]);

  const handleCopySecret = async () => {
    if (!secret) return;
    try {
      await copySecure(secret, 30);
      setCopied(true);
      toast.success("Secret copied! Clipboard will clear in 30s");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Authenticator 2FA Setup"
      description="Scan with Google Authenticator, Microsoft Authenticator, or 2FAS"
      maxWidth="sm"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* QR Code Container with crisp white backing for maximum camera scan contrast */}
        <div className="w-56 h-56 rounded-2xl bg-white p-3 shadow-inner flex items-center justify-center border border-border-default relative">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-zinc-500 text-xs">
              <QrCode className="w-8 h-8 animate-pulse text-zinc-400" />
              <span>Generating QR Code...</span>
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="TOTP 2FA QR Code"
              className="w-full h-full object-contain select-none pointer-events-none rounded-lg"
            />
          ) : (
            <div className="text-zinc-400 text-xs">No QR Code Available</div>
          )}
        </div>

        {/* Account Info */}
        {(title || username) && (
          <div className="bg-surface-2 border border-border-subtle rounded-xl px-3 py-1.5 text-xs text-text-secondary flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="font-semibold text-text-primary">{title || "Account"}</span>
            {username && <span className="text-text-muted">({username})</span>}
          </div>
        )}

        {/* Secret Key Display */}
        {secret && (
          <div className="w-full bg-surface-2 border border-border-subtle rounded-xl p-3 text-left space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold text-text-secondary uppercase tracking-wider">
                Manual Entry Key
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer transition-colors"
                  title={showSecret ? "Hide secret" : "Reveal secret"}
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-text-primary break-all">
                {showSecret ? secret : "••••••••••••••••••••••••"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 shrink-0"
                onClick={handleCopySecret}
                title="Copy Secret"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-success-text" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <p className="text-2xs text-text-muted leading-relaxed">
          Open your Authenticator app, tap <strong>Add Account (+)</strong>, and choose{" "}
          <strong>Scan a QR code</strong>.
        </p>

        <Button variant="secondary" size="md" className="w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
