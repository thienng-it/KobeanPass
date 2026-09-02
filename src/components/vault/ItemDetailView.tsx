import { useState, useEffect } from "react";
import {
  KeyRound,
  FileText,
  CreditCard,
  User,
  Star,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Folder,
  FolderInput,
  FolderSync,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getItem,
  toggleFavorite,
  trashItem,
  copySecure,
  getTotpCode,
  listFolders,
  checkPasswordStrength,
} from "@/lib/tauri";
import { getPasswordStrengthMeter } from "@/lib/passwordStrength";
import type { DecryptedItem, TotpCode, FolderInfo, StrengthResult } from "@/lib/types";
import { TotpQrModal } from "./TotpQrModal";
import { MoveToFolderModal } from "@/components/folders/MoveToFolderModal";
import { toast } from "sonner";

interface ItemDetailViewProps {
  itemId: string;
  onBack?: () => void;
  onEdit: () => void;
  onItemChanged: () => void;
}

const passwordStrengthToneClasses = {
  danger: {
    icon: "bg-danger-surface text-danger-text",
    text: "text-danger-text",
    meter: "bg-danger-solid",
  },
  warning: {
    icon: "bg-warning-surface text-warning-text",
    text: "text-warning-text",
    meter: "bg-warning-solid",
  },
  success: {
    icon: "bg-success-surface text-success-text",
    text: "text-success-text",
    meter: "bg-success-solid",
  },
};

export function ItemDetailView({ itemId, onBack, onEdit, onItemChanged }: ItemDetailViewProps) {
  const [item, setItem] = useState<DecryptedItem | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [totp, setTotp] = useState<TotpCode | null>(null);
  const [isTotpQrOpen, setIsTotpQrOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<StrengthResult | null>(null);
  const [isPasswordStrengthLoading, setIsPasswordStrengthLoading] = useState(false);
  const loginPassword = item?.payload.type === "login" ? item.payload.data.password : "";

  const handleOpenMoveModal = async () => {
    try {
      const f = await listFolders();
      setFolders(f);
      setIsMoveModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getItem(itemId)
      .then((data) => {
        setItem(data);
        setShowPassword(false);
      })
      .catch((e) => console.error(e));
  }, [itemId]);

  useEffect(() => {
    if (!loginPassword) {
      setPasswordStrength(null);
      setIsPasswordStrengthLoading(false);
      return;
    }

    let isCurrent = true;
    setPasswordStrength(null);
    setIsPasswordStrengthLoading(true);

    checkPasswordStrength(loginPassword)
      .then((strength) => {
        if (isCurrent) setPasswordStrength(strength);
      })
      .catch(() => {
        if (isCurrent) setPasswordStrength(null);
      })
      .finally(() => {
        if (isCurrent) setIsPasswordStrengthLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [loginPassword]);

  // TOTP Polling / Timer
  useEffect(() => {
    let interval: any;
    const hasTotp =
      item &&
      ((item.payload.type === "login" && item.payload.data.totp_secret) ||
        (item.payload.type === "otp" && item.payload.data.totp_secret));

    if (hasTotp) {
      const fetchTotp = async () => {
        try {
          const res = await getTotpCode(itemId);
          setTotp(res);
        } catch (e) {
          console.error(e);
        }
      };

      fetchTotp();
      interval = setInterval(fetchTotp, 1000);
    } else {
      setTotp(null);
    }
    return () => clearInterval(interval);
  }, [item, itemId]);

  // Auto-re-mask password after 15 seconds
  useEffect(() => {
    let timeout: any;
    if (showPassword) {
      timeout = setTimeout(() => setShowPassword(false), 15000);
    }
    return () => clearTimeout(timeout);
  }, [showPassword]);

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await copySecure(text, 30);
      setCopiedField(fieldName);
      toast.success(`Copied ${fieldName} (auto-clears in 30s)!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleToggleFavorite = async () => {
    if (!item) return;
    try {
      const isFav = await toggleFavorite(item.id);
      setItem({ ...item, is_favorite: isFav });
      onItemChanged();
      toast.success(isFav ? "Added to favorites" : "Removed from favorites");
    } catch {
      toast.error("Failed to toggle favorite");
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (confirm(`Move "${item.title}" to trash?`)) {
      try {
        await trashItem(item.id);
        toast.success("Item moved to trash");
        onItemChanged();
      } catch {
        toast.error("Failed to delete item");
      }
    }
  };

  // Render character-class colored password
  const renderColorizedPassword = (pwd: string) => {
    return pwd.split("").map((ch, idx) => {
      let colorClass = "text-text-primary";
      if (/[0-9]/.test(ch)) colorClass = "text-info-text font-bold";
      else if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?/]/.test(ch)) colorClass = "text-warning-text font-bold";
      else if (/[A-Z]/.test(ch)) colorClass = "text-accent font-bold";

      return (
        <span key={idx} className={colorClass}>
          {ch}
        </span>
      );
    });
  };

  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-text-muted text-sm">
        Loading item details...
      </div>
    );
  }

  const payload = item.payload;
  const strengthMeter = passwordStrength
    ? getPasswordStrengthMeter(passwordStrength.score)
    : null;
  const passwordStrengthDetails = passwordStrength && strengthMeter
    ? {
        strength: passwordStrength,
        meter: strengthMeter,
        toneClasses: passwordStrengthToneClasses[strengthMeter.tone],
      }
    : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-0 overflow-y-auto select-text">
      {/* Top Action Toolbar */}
      <div className="px-5 py-2.5 border-b border-border-default/60 bg-surface-1 flex items-center justify-between gap-2 shrink-0">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="h-7.5 px-2 text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            )}
            {!onBack && (
              <span className="inline-flex items-center gap-1.5 text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-2 text-text-secondary border border-border-subtle shrink-0">
                {item.item_type === "login" && <KeyRound className="w-3 h-3 text-accent" />}
                {item.item_type === "otp" && <ShieldCheck className="w-3 h-3 text-accent" />}
                {item.item_type === "secure_note" && <FileText className="w-3 h-3 text-warning-text" />}
                {item.item_type === "credit_card" && <CreditCard className="w-3 h-3 text-success-text" />}
                {item.item_type === "identity" && <User className="w-3 h-3 text-info-text" />}
                <span className="capitalize">{item.item_type.replace("_", " ")}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 select-none">
          <Button
            variant="ghost"
            size={onBack ? "icon" : "sm"}
            onClick={handleToggleFavorite}
            className={`h-7.5 text-xs font-semibold ${
              onBack ? "w-7.5" : "px-2.5"
            } ${item.is_favorite ? "text-warning-text hover:text-warning-text bg-warning-surface/30" : "text-text-muted"}`}
            aria-label={item.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
            title={item.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            <Star className={`w-3.5 h-3.5 ${onBack ? "" : "mr-1"} ${item.is_favorite ? "fill-warning-text text-warning-text" : ""}`} />
            {!onBack && <span>{item.is_favorite ? "Favorited" : "Favorite"}</span>}
          </Button>
          <Button
            variant="secondary"
            size={onBack ? "icon" : "sm"}
            onClick={handleOpenMoveModal}
            className={`h-7.5 text-xs font-semibold ${onBack ? "w-7.5" : ""}`}
            aria-label="Move to Folder"
            title="Move to Folder"
          >
            <FolderInput className={`w-3.5 h-3.5 ${onBack ? "" : "mr-1"}`} />
            {!onBack && "Move"}
          </Button>
          <Button
            variant="secondary"
            size={onBack ? "icon" : "sm"}
            onClick={onEdit}
            className={`h-7.5 text-xs font-semibold ${onBack ? "w-7.5" : ""}`}
            aria-label="Edit Item"
            title="Edit Item"
          >
            <Edit className={`w-3.5 h-3.5 ${onBack ? "" : "mr-1"}`} />
            {!onBack && "Edit"}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="h-7.5 w-7.5 hover:text-danger-text" aria-label="Delete Item" title="Delete Item">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          </div>
        </div>
      </div>

      {/* Hero Header (Always Full Width — Never Squished) */}
      <div className="p-5 sm:p-6 border-b border-border-default/40 bg-surface-1/40">
        <div className="w-full max-w-5xl mx-auto flex items-start gap-4">
          <div className="w-13 h-13 rounded-2xl bg-surface-2 border border-border-strong flex items-center justify-center text-accent shadow-sm shrink-0 mt-0.5">
            {item.item_type === "login" && <KeyRound className="w-6 h-6" />}
            {item.item_type === "otp" && <ShieldCheck className="w-6 h-6 text-accent" />}
            {item.item_type === "secure_note" && <FileText className="w-6 h-6 text-warning-text" />}
            {item.item_type === "credit_card" && <CreditCard className="w-6 h-6 text-success-text" />}
            {item.item_type === "identity" && <User className="w-6 h-6 text-info-text" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {item.subtitle && (
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 truncate">
                    {item.subtitle}
                  </div>
                )}
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight leading-snug break-words">
                  {item.title}
                </h1>
              </div>

              {/* Folder badge on the right */}
              <button
                type="button"
                onClick={handleOpenMoveModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-2 hover:bg-accent-surface text-text-secondary hover:text-accent border border-border-subtle hover:border-accent-border transition-all cursor-pointer group shrink-0 shadow-xs mt-0.5"
                title="Click to change folder"
              >
                <Folder className="w-3.5 h-3.5 text-text-muted group-hover:text-accent shrink-0" />
                <span className="truncate max-w-[200px]">{item.tags && item.tags[0] ? item.tags[0] : "No Folder (Root)"}</span>
                <FolderSync className="w-3 h-3 opacity-60 group-hover:opacity-100 ml-0.5 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Fields */}
      <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
        {/* OTP Authenticator Details */}
        {payload.type === "otp" && (
          <div className="space-y-4">
            {/* Account / Username */}
            {payload.data.account && (
              <div className="p-3.5 bg-surface-1 border border-border-default rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                    Account / Username
                  </span>
                  <span className="text-sm font-medium text-text-primary mt-0.5 block">
                    {payload.data.account}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(payload.data.account, "Account")}
                >
                  {copiedField === "Account" ? (
                    <Check className="w-4 h-4 text-success-text" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}

            {/* TOTP Code */}
            {totp && (
              <div className="p-4 bg-accent-surface/30 border border-accent-border rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-2xs font-semibold text-accent uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" /> Two-Factor Code (TOTP)
                  </div>
                  <div className="font-mono text-3xl font-bold tracking-widest text-text-primary mt-1">
                    {totp.code.slice(0, 3)} {totp.code.slice(3)}
                  </div>
                  <div className="text-2xs text-text-muted mt-0.5">
                    Refreshes in {totp.remaining_seconds}s
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Circular Timer */}
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg className="w-9 h-9 transform -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        className="text-surface-3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 15}
                        strokeDashoffset={
                          2 * Math.PI * 15 * (1 - totp.remaining_seconds / totp.period)
                        }
                        className={`transition-all duration-1000 ${
                          totp.remaining_seconds <= 5
                            ? "text-danger-text"
                            : "text-accent"
                        }`}
                      />
                    </svg>
                    <span className="absolute font-mono text-2xs font-semibold">
                      {totp.remaining_seconds}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCopy(totp.code, "2FA Code")}
                  >
                    {copiedField === "2FA Code" ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <Copy className="w-4 h-4 mr-1" />
                    )}
                    {copiedField === "2FA Code" ? "Copied" : "Copy Code"}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsTotpQrOpen(true)}
                    title="Export QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Login Details */}
        {payload.type === "login" && (
          <div className="space-y-4">
            {/* Username */}
            {payload.data.username && (
              <div className="p-3.5 bg-surface-1 border border-border-default rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                    Username / Email
                  </span>
                  <span className="text-sm font-medium text-text-primary mt-0.5 block">
                    {payload.data.username}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(payload.data.username, "Username")}
                >
                  {copiedField === "Username" ? (
                    <Check className="w-4 h-4 text-success-text" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}

            {/* Password */}
            {payload.data.password && (
              <div className="p-3.5 bg-surface-1 border border-border-default rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                        Password
                      </span>
                      {showPassword && (
                        <span className="text-2xs text-text-muted">(auto-hides in 15s)</span>
                      )}
                    </div>
                    <div className="font-mono text-sm tracking-wider mt-0.5">
                      {showPassword ? (
                        renderColorizedPassword(payload.data.password)
                      ) : (
                        <span className="text-text-muted">••••••••••••••••</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide" : "Reveal"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(payload.data.password, "Password")}
                    >
                      {copiedField === "Password" ? (
                        <Check className="w-4 h-4 text-success-text" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {(isPasswordStrengthLoading || passwordStrengthDetails) && (
                  <div className="mt-3 pt-3 border-t border-border-subtle" aria-live="polite">
                    {isPasswordStrengthLoading ? (
                      <span className="text-2xs text-text-muted">Checking password strength…</span>
                    ) : passwordStrengthDetails ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${passwordStrengthDetails.toneClasses.icon}`}>
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
                                Password strength
                              </div>
                              <div className={`text-xs font-semibold ${passwordStrengthDetails.toneClasses.text}`}>
                                {passwordStrengthDetails.strength.label}
                              </div>
                            </div>
                          </div>
                          <span className="text-2xs text-text-muted sm:text-right">
                            Crack time: {passwordStrengthDetails.strength.crack_time}
                          </span>
                        </div>
                        <div
                          role="img"
                          aria-label={`Password strength: ${passwordStrengthDetails.strength.label}; estimated crack time: ${passwordStrengthDetails.strength.crack_time}`}
                          className="grid grid-cols-4 gap-1.5 h-1.5 mt-3"
                        >
                          {[1, 2, 3, 4].map((step) => (
                            <span
                              key={step}
                              className={`rounded-full motion-safe:transition-colors motion-safe:duration-150 ${
                                step <= passwordStrengthDetails.meter.activeSteps
                                  ? passwordStrengthDetails.toneClasses.meter
                                  : "bg-surface-3"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* TOTP Code */}
            {totp && (
              <div className="p-4 bg-accent-surface/30 border border-accent-border rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-2xs font-semibold text-accent uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" /> Two-Factor Code (TOTP)
                  </div>
                  <div className="font-mono text-2xl font-bold tracking-widest text-text-primary mt-1">
                    {totp.code.slice(0, 3)} {totp.code.slice(3)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Circular Timer */}
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <svg className="w-8 h-8 transform -rotate-90">
                      <circle
                        cx="16"
                        cy="16"
                        r="13"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        fill="transparent"
                        className="text-surface-3"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="13"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 13}
                        strokeDashoffset={
                          2 * Math.PI * 13 * (1 - totp.remaining_seconds / totp.period)
                        }
                        className={`transition-all duration-1000 ${
                          totp.remaining_seconds <= 5
                            ? "text-danger-text"
                            : "text-accent"
                        }`}
                      />
                    </svg>
                    <span className="absolute font-mono text-3xs font-semibold">
                      {totp.remaining_seconds}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCopy(totp.code, "2FA Code")}
                  >
                    {copiedField === "2FA Code" ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <Copy className="w-4 h-4 mr-1" />
                    )}
                    {copiedField === "2FA Code" ? "Copied" : "Copy"}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsTotpQrOpen(true)}
                    title="Export QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Website URL */}
            {payload.data.url && (
              <div className="p-3.5 bg-surface-1 border border-border-default rounded-2xl flex items-center justify-between">
                <div className="min-w-0 pr-4">
                  <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                    Website
                  </span>
                  <a
                    href={payload.data.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-accent hover:underline flex items-center gap-1 mt-0.5 truncate"
                  >
                    {payload.data.url} <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(payload.data.url, "URL")}
                >
                  {copiedField === "URL" ? (
                    <Check className="w-4 h-4 text-success-text" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Secure Note */}
        {payload.type === "secure_note" && (
          <div className="p-4 bg-surface-1 border border-border-default rounded-2xl space-y-2">
            <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
              Note Content
            </span>
            <div className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed bg-surface-0 p-4 rounded-xl border border-border-subtle">
              {payload.data.content || "Empty note"}
            </div>
          </div>
        )}

        {/* Credit Card */}
        {payload.type === "credit_card" && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-surface-2 to-surface-1 border border-border-strong rounded-2xl space-y-4 shadow-md">
              <div className="flex justify-between items-center text-xs font-mono uppercase text-text-muted">
                <span>Credit Card</span>
                <span>{payload.data.brand || "Card"}</span>
              </div>
              <div className="font-mono text-lg font-bold tracking-widest text-text-primary">
                {payload.data.number || "•••• •••• •••• ••••"}
              </div>
              <div className="flex justify-between items-end text-xs">
                <div>
                  <span className="text-2xs text-text-muted block">CARDHOLDER</span>
                  <span className="font-semibold text-text-primary">
                    {payload.data.cardholder || "NOT SPECIFIED"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xs text-text-muted block">EXPIRES</span>
                  <span className="font-mono font-semibold text-text-primary">
                    {payload.data.expiry_month || "MM"}/{payload.data.expiry_year || "YY"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="pt-2">
            <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
              Tags
            </span>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <Badge key={t} variant="default" size="md">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TOTP QR Code Modal */}
      {(payload.type === "login" || payload.type === "otp") && payload.data.totp_secret && (
        <TotpQrModal
          isOpen={isTotpQrOpen}
          onClose={() => setIsTotpQrOpen(false)}
          itemId={item.id}
          secret={payload.data.totp_secret}
          title={item.title}
          username={payload.type === "login" ? payload.data.username : payload.data.account}
        />
      )}

      {/* Move to Folder Modal */}
      <MoveToFolderModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        itemId={item.id}
        itemTitle={item.title}
        currentFolder={item.tags && item.tags[0] ? item.tags[0] : null}
        folders={folders}
        onMoved={() => {
          onItemChanged();
          getItem(itemId).then(setItem).catch(console.error);
        }}
      />
    </div>
  );
}
