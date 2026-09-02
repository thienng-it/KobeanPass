import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  KeyRound,
  FileText,
  CreditCard,
  ShieldCheck,
  Sparkles,
  QrCode,
  ClipboardPaste,
  Folder,
  FolderPlus,
  Globe,
  User,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/Select";
import { useAppStore } from "@/stores/appStore";
import { createItem, updateItem, getItem, generatePassword, parseTotpUri, listFolders } from "@/lib/tauri";
import { readClipboardForTotp } from "@/lib/qr";
import type { ItemType, VaultRecordPayload, CustomField, TotpConfig, FolderInfo } from "@/lib/types";
import { QrScannerModal } from "./QrScannerModal";
import { TotpQrModal } from "./TotpQrModal";
import { FolderManagerModal } from "@/components/folders/FolderManagerModal";
import { FolderPicker } from "@/components/folders/FolderPicker";
import { toast } from "sonner";

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialTag?: string | null;
}

const CATEGORY_OPTIONS = [
  {
    value: "login" as ItemType,
    label: "Login",
    description: "Username, password & website",
    icon: <KeyRound className="w-3.5 h-3.5" />,
  },
  {
    value: "otp" as ItemType,
    label: "2FA / OTP Authenticator",
    description: "Time-based authentication code",
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  {
    value: "secure_note" as ItemType,
    label: "Secure Note",
    description: "Encrypted private text & memos",
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  {
    value: "credit_card" as ItemType,
    label: "Credit Card",
    description: "Card number, expiration & CVV",
    icon: <CreditCard className="w-3.5 h-3.5" />,
  },
];

export function ItemFormModal({ isOpen, onClose, onSaved, initialTag }: ItemFormModalProps) {
  const { itemModalMode, itemModalType, selectedItemId } = useAppStore();
  const [itemType, setItemType] = useState<ItemType>(itemModalType);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [existingFolders, setExistingFolders] = useState<FolderInfo[]>([]);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR Modal States
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isQrPreviewOpen, setIsQrPreviewOpen] = useState(false);

  // Login / OTP fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [totpSecret, setTotpSecret] = useState("");

  // Note fields
  const [noteContent, setNoteContent] = useState("");

  // Credit Card fields
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");

  // Shared
  const [notes, setNotes] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    if (isOpen) {
      listFolders().then(setExistingFolders).catch(console.error);

      if (itemModalMode === "edit" && selectedItemId) {
        getItem(selectedItemId).then((item) => {
          setTitle(item.title);
          setItemType(item.item_type as ItemType);
          setTags(item.tags || []);

          if (item.payload.type === "login") {
            setUsername(item.payload.data.username || "");
            setPassword(item.payload.data.password || "");
            setUrl(item.payload.data.url || "");
            setTotpSecret(item.payload.data.totp_secret || "");
            setNotes(item.payload.data.notes || "");
            setCustomFields(item.payload.data.custom_fields || []);
          } else if (item.payload.type === "otp") {
            setUsername(item.payload.data.account || "");
            setTotpSecret(item.payload.data.totp_secret || "");
            setNotes(item.payload.data.notes || "");
            setCustomFields(item.payload.data.custom_fields || []);
          } else if (item.payload.type === "secure_note") {
            setNoteContent(item.payload.data.content || "");
            setNotes(item.payload.data.notes || "");
            setCustomFields(item.payload.data.custom_fields || []);
          } else if (item.payload.type === "credit_card") {
            setCardholder(item.payload.data.cardholder || "");
            setCardNumber(item.payload.data.number || "");
            setExpiryMonth(item.payload.data.expiry_month || "");
            setExpiryYear(item.payload.data.expiry_year || "");
            setCvv(item.payload.data.cvv || "");
            setNotes(item.payload.data.notes || "");
            setCustomFields(item.payload.data.custom_fields || []);
          }
        });
      } else {
        // Reset form for create
        setTitle("");
        setUsername("");
        setPassword("");
        setUrl("");
        setTotpSecret("");
        setNoteContent("");
        setCardholder("");
        setCardNumber("");
        setExpiryMonth("");
        setExpiryYear("");
        setCvv("");
        setNotes("");
        setCustomFields([]);
        setTags(initialTag ? [initialTag] : []);
        setItemType(itemModalType);
      }
    }
  }, [isOpen, itemModalMode, itemModalType, selectedItemId, initialTag]);

  const handleGeneratePassword = async () => {
    try {
      const res = await generatePassword({
        length: 20,
        uppercase: true,
        lowercase: true,
        digits: true,
        symbols: true,
        exclude_ambiguous: false,
      });
      setPassword(res.password);
      toast.success("Password generated!");
    } catch {
      toast.error("Failed to generate password");
    }
  };

  const handleTotpScanned = (config: TotpConfig) => {
    setTotpSecret(config.secret);
    if (!title && config.issuer) setTitle(config.issuer);
    if (!username && config.account) setUsername(config.account);
  };

  const handleQuickPasteTotp = async () => {
    try {
      const result = await readClipboardForTotp();
      if (result) {
        if (result.type === "qr" || result.type === "uri") {
          try {
            const config = await parseTotpUri(result.data);
            handleTotpScanned(config);
            toast.success(`Imported 2FA key for ${config.issuer || config.account || "item"}`);
            return;
          } catch {}
        }
        const clean = result.data.replace(/[\s-]+/g, "").toUpperCase();
        setTotpSecret(clean);
        toast.success("2FA secret key pasted!");
        return;
      }
      setIsQrScannerOpen(true);
    } catch {
      setIsQrScannerOpen(true);
    }
  };

  const handleTotpChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.trim().startsWith("otpauth://")) {
      try {
        const config = await parseTotpUri(val.trim());
        handleTotpScanned(config);
        toast.success(`Imported 2FA key for ${config.issuer || config.account || "login"}`);
        return;
      } catch {}
    }
    setTotpSecret(val);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      let payload: VaultRecordPayload;

      if (itemType === "login") {
        payload = {
          type: "login",
          data: {
            username,
            password,
            url,
            urls: [url].filter(Boolean),
            totp_secret: totpSecret || undefined,
            notes,
            custom_fields: customFields,
          },
        };
      } else if (itemType === "otp") {
        payload = {
          type: "otp",
          data: {
            account: username,
            totp_secret: totpSecret,
            notes,
            custom_fields: customFields,
          },
        };
      } else if (itemType === "secure_note") {
        payload = {
          type: "secure_note",
          data: {
            content: noteContent,
            notes,
            custom_fields: customFields,
          },
        };
      } else if (itemType === "credit_card") {
        payload = {
          type: "credit_card",
          data: {
            cardholder,
            number: cardNumber,
            expiry_month: expiryMonth,
            expiry_year: expiryYear,
            cvv,
            notes,
            custom_fields: customFields,
          },
        };
      } else {
        payload = {
          type: "secure_note",
          data: {
            content: noteContent,
            notes,
            custom_fields: customFields,
          },
        };
      }

      const finalTags = Array.from(new Set(tags));

      if (itemModalMode === "create") {
        await createItem(title, itemType, payload, finalTags);
        toast.success("Item saved securely!");
      } else if (selectedItemId) {
        await updateItem(selectedItemId, title, payload, finalTags);
        toast.success("Item updated!");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Failed to save item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubModalOpen = isQrScannerOpen || isQrPreviewOpen || isFolderManagerOpen;

  return (
    <>
      <Modal
        isOpen={isOpen && !isSubModalOpen}
        onClose={onClose}
        title={itemModalMode === "create" ? "New Vault Item" : "Edit Item"}
        description="Zero-knowledge record encrypted before writing to storage."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Group 1: Primary Credentials Card */}
          <div className="bg-surface-2/40 border border-border-default rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Row 1: Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Item Title *
              </label>
              <Input
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="e.g. GitHub, Google, Netflix, Work WiFi"
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-text-secondary">
                  Category
                </label>
              </div>
              <CustomSelect
                value={itemType}
                onChange={(val) => setItemType(val as ItemType)}
                options={CATEGORY_OPTIONS}
                footerAction={{
                  label: "+ Manage Folders...",
                  icon: <FolderPlus className="w-4 h-4" />,
                  onClick: () => setIsFolderManagerOpen(true),
                }}
              />
            </div>
          </div>

          {/* Login Fields */}
          {itemType === "login" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Username / Email
                  </label>
                  <Input
                    value={username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                    placeholder="user@example.com"
                    leftIcon={<User className="w-4 h-4 text-text-muted" />}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Password</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generate
                    </button>
                  </div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Website URL
                </label>
                <Input
                  value={url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                  placeholder="https://example.com/login"
                  leftIcon={<Globe className="w-4 h-4 text-text-muted" />}
                />
              </div>

              {/* 2FA Setup Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-text-secondary">
                    2FA Authenticator Key (Optional)
                  </label>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleQuickPasteTotp}
                      className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" /> Paste
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsQrScannerOpen(true)}
                      className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Screenshot
                    </button>
                    {totpSecret && (
                      <button
                        type="button"
                        onClick={() => setIsQrPreviewOpen(true)}
                        className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <QrCode className="w-3.5 h-3.5" /> View QR
                      </button>
                    )}
                  </div>
                </div>
                <Input
                  value={totpSecret}
                  onChange={handleTotpChange}
                  placeholder="Paste setup key or otpauth:// URL"
                  className="font-mono text-sm"
                />
              </div>
            </>
          )}

          {/* OTP Fields */}
          {itemType === "otp" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Account / Username
                </label>
                <Input
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  placeholder="e.g. user@gmail.com, @github_handle"
                  leftIcon={<User className="w-4 h-4 text-text-muted" />}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-text-secondary">
                    2FA Secret Key / Setup Key *
                  </label>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleQuickPasteTotp}
                      className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" /> Paste
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsQrScannerOpen(true)}
                      className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Screenshot
                    </button>
                    {totpSecret && (
                      <button
                        type="button"
                        onClick={() => setIsQrPreviewOpen(true)}
                        className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <QrCode className="w-3.5 h-3.5" /> View QR
                      </button>
                    )}
                  </div>
                </div>
                <Input
                  value={totpSecret}
                  onChange={handleTotpChange}
                  placeholder="Paste setup key or otpauth:// URL"
                  className="font-mono text-sm"
                  required
                />
              </div>
            </>
          )}

          {/* Secure Note Content */}
          {itemType === "secure_note" && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Note Content
              </label>
              <textarea
                value={noteContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteContent(e.target.value)}
                placeholder="Write private notes, recovery phrases, or private keys here..."
                rows={5}
                className="w-full bg-surface-1 border border-border-default rounded-xl p-3.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          )}

          {/* Credit Card Fields */}
          {itemType === "credit_card" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Cardholder Name
                </label>
                <Input
                  value={cardholder}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCardholder(e.target.value)}
                  placeholder="JOHN DOE"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Card Number
                </label>
                <Input
                  value={cardNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCardNumber(e.target.value)}
                  placeholder="4000 1234 5678 9010"
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Month</label>
                  <Input
                    value={expiryMonth}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiryMonth(e.target.value)}
                    placeholder="MM"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Year</label>
                  <Input
                    value={expiryYear}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiryYear(e.target.value)}
                    placeholder="YYYY"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">CVV</label>
                  <Input
                    value={cvv}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCvv(e.target.value)}
                    placeholder="123"
                    type="password"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Group 2: Destination Folder Selection */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-accent" /> Destination Folder
            </label>
            <button
              type="button"
              onClick={() => setIsFolderManagerOpen(true)}
              className="text-xs text-accent hover:underline font-semibold cursor-pointer"
            >
              + Manage Folders
            </button>
          </div>

          <FolderPicker
            value={tags.length > 0 ? tags[0] : null}
            onChange={(selectedFolder) => {
              setTags(selectedFolder ? [selectedFolder] : []);
            }}
            folders={existingFolders}
            onOpenFolderManager={() => setIsFolderManagerOpen(true)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
          <Button type="button" variant="ghost" size="md" onClick={onClose} className="px-5">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="px-6 font-semibold">
            {itemModalMode === "create" ? "Save to Vault" : "Update Item"}
          </Button>
        </div>
      </form>
    </Modal>

    {/* QR Code Scanner Modal */}
    <QrScannerModal
      isOpen={isQrScannerOpen}
      onClose={() => setIsQrScannerOpen(false)}
      onScanned={handleTotpScanned}
    />

    {/* QR Code Preview Modal */}
    <TotpQrModal
      isOpen={isQrPreviewOpen}
      onClose={() => setIsQrPreviewOpen(false)}
      secret={totpSecret}
      title={title}
      username={username}
    />

    {/* Folder & Category Manager Modal */}
    <FolderManagerModal
      isOpen={isFolderManagerOpen}
      onClose={() => setIsFolderManagerOpen(false)}
      onFoldersChanged={() => {
        listFolders().then(setExistingFolders).catch(console.error);
      }}
    />
  </>
);
}
