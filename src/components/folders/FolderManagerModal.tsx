import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FolderKanban,
  ExternalLink,
  CornerDownRight,
  FolderPlus,
} from "lucide-react";
import { listFolders, createFolder, renameFolder, deleteFolder } from "@/lib/tauri";
import { type FolderInfo, type FolderTreeNode, buildFolderTree } from "@/lib/types";
import { toast } from "sonner";

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder?: (folderName: string) => void;
  onFoldersChanged: () => void;
  initialParentFolder?: string;
}

export function FolderManagerModal({
  isOpen,
  onClose,
  onSelectFolder,
  onFoldersChanged,
  initialParentFolder,
}: FolderManagerModalProps) {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [parentFolder, setParentFolder] = useState<string>(initialParentFolder || "");
  const [editingFolderName, setEditingFolderName] = useState<string | null>(null);
  const [deletingFolderName, setDeletingFolderName] = useState<string | null>(null);
  const [editInputValue, setEditInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchFolderList = async () => {
    setIsLoading(true);
    try {
      const list = await listFolders();
      setFolders(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFolderList();
      setNewFolderName("");
      setParentFolder(initialParentFolder || "");
      setEditingFolderName(null);
    }
  }, [isOpen, initialParentFolder]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newFolderName.trim();
    if (!raw) return;

    let targetPath = raw;
    if (parentFolder && !raw.startsWith(parentFolder + "/")) {
      targetPath = `${parentFolder}/${raw}`;
    }

    if (folders.some((f) => f.name.toLowerCase() === targetPath.toLowerCase())) {
      toast.error(`Folder "${targetPath}" already exists`);
      return;
    }

    try {
      await createFolder(targetPath);
      toast.success(`Folder "${targetPath}" created!`);
      setNewFolderName("");
      setParentFolder("");
      await fetchFolderList();
      onFoldersChanged();
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Failed to create folder");
    }
  };

  const handleStartRename = (name: string) => {
    setEditingFolderName(name);
    setEditInputValue(name);
  };

  const handleSaveRename = async (oldName: string) => {
    const trimmed = editInputValue.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingFolderName(null);
      return;
    }

    try {
      await renameFolder(oldName, trimmed);
      toast.success(`Folder renamed to "${trimmed}"`);
      setEditingFolderName(null);
      await fetchFolderList();
      onFoldersChanged();
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Failed to rename folder");
    }
  };

  const handleDeleteFolder = (folderName: string) => {
    setDeletingFolderName(folderName);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deletingFolderName) return;
    try {
      await deleteFolder(deletingFolderName);
      toast.success(`Folder "${deletingFolderName}" deleted`);
      setDeletingFolderName(null);
      await fetchFolderList();
      onFoldersChanged();
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Failed to delete folder");
    }
  };

  // Recursive tree row renderer
  const renderTreeNode = (node: FolderTreeNode) => {
    const isEditing = editingFolderName === node.name;
    const isParentSelected = parentFolder === node.name;

    return (
      <React.Fragment key={node.name}>
        <div
          className={`p-2.5 flex items-center justify-between hover:bg-surface-2/70 transition-colors gap-2 border-b border-border-subtle/60 ${
            isParentSelected ? "bg-accent-surface/40" : ""
          }`}
          style={{ paddingLeft: `${node.depth * 20 + 12}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {node.depth > 0 && (
              <CornerDownRight className="w-3.5 h-3.5 text-text-muted shrink-0 -ml-1 mr-0.5" />
            )}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
              node.depth > 0
                ? "bg-surface-2 text-text-secondary border-border-subtle"
                : "bg-accent-surface text-accent border-accent-border"
            }`}>
              {node.children.length > 0 ? (
                <FolderOpen className="w-3.5 h-3.5" />
              ) : (
                <Folder className="w-3.5 h-3.5" />
              )}
            </div>

            {isEditing ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Input
                  value={editInputValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditInputValue(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename(node.name);
                    if (e.key === "Escape") setEditingFolderName(null);
                  }}
                  className="h-7 text-xs flex-1"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(node.name)}
                  className="p-1 rounded-md bg-accent text-white hover:bg-accent/90 cursor-pointer"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFolderName(null)}
                  className="p-1 rounded-md hover:bg-surface-3 text-text-muted hover:text-text-primary cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-text-primary truncate">
                    {node.displayName}
                  </span>
                  {node.depth > 0 && (
                    <span className="text-3xs text-text-muted truncate hidden sm:inline">
                      ({node.name})
                    </span>
                  )}
                  <span className="text-3xs font-mono px-1.5 py-0.2 rounded-md bg-surface-3 text-text-muted border border-border-subtle shrink-0">
                    {node.total_item_count} {node.total_item_count === 1 ? "item" : "items"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-3xs px-2"
                onClick={() => setParentFolder(node.name)}
                title={`Create subfolder inside "${node.name}"`}
              >
                <Plus className="w-3 h-3 mr-1 text-accent" /> Subfolder
              </Button>

              {onSelectFolder && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-3xs px-2"
                  onClick={() => {
                    onSelectFolder(node.name);
                    onClose();
                  }}
                  title="Open Folder"
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> View
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => handleStartRename(node.name)}
                title="Rename folder"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-7 h-7 hover:text-danger-text"
                onClick={() => handleDeleteFolder(node.name)}
                title="Delete folder and subfolders"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {node.children.map((child) => renderTreeNode(child))}
      </React.Fragment>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Folders & Projects Manager"
      description="Organize your credentials into hierarchical folders, subfolders, and projects."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Create Folder Form */}
        <form onSubmit={handleCreateFolder} className="bg-surface-2/40 border border-border-default rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text-secondary">
              {parentFolder ? (
                <span className="flex items-center gap-1.5 text-accent">
                  <CornerDownRight className="w-3.5 h-3.5" />
                  New Subfolder inside: <strong>{parentFolder}</strong>
                </span>
              ) : (
                "Create New Top-Level Folder"
              )}
            </span>
            {parentFolder && (
              <button
                type="button"
                onClick={() => setParentFolder("")}
                className="text-3xs text-text-muted hover:text-text-primary underline cursor-pointer"
              >
                Switch to Top-Level
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={newFolderName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
              placeholder={
                parentFolder
                  ? `e.g. Frontend, Backend, Sprint 1...`
                  : `e.g. Work, Personal, Crypto, Client A (or Work/Design)...`
              }
              className="flex-1"
              autoFocus
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!newFolderName.trim()}
            >
              <FolderPlus className="w-4 h-4 mr-1" /> Create
            </Button>
          </div>
          <p className="text-3xs text-text-muted">
            Tip: You can create nested folders directly by typing slashes (e.g. <kbd className="font-mono bg-surface-3 px-1 py-0.5 rounded">Work/Dev/Frontend</kbd>).
          </p>
        </form>

        {/* Hierarchical Folders List */}
        <div className="border border-border-default rounded-2xl bg-surface-1/50 overflow-hidden max-h-84 overflow-y-auto">
          {isLoading && folders.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted">Loading folders...</div>
          ) : folderTree.length === 0 ? (
            <div className="p-8 text-center text-text-muted space-y-2">
              <FolderKanban className="w-8 h-8 text-surface-3 mx-auto" />
              <p className="text-xs">No folders or projects created yet.</p>
              <p className="text-2xs text-text-muted">
                Create your first folder above to organize credentials hierarchically.
              </p>
            </div>
          ) : (
            <div>{folderTree.map((rootNode) => renderTreeNode(rootNode))}</div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-border-subtle">
          <Button type="button" variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>

        <ConfirmModal
          isOpen={Boolean(deletingFolderName)}
          onClose={() => setDeletingFolderName(null)}
          onConfirm={handleConfirmDeleteFolder}
          title={`Delete "${deletingFolderName}"?`}
          description="Are you sure you want to delete this folder and all its subfolders? Items inside will not be deleted, but will be unlinked from this folder."
          confirmLabel="Delete Folder"
          variant="danger"
        />
      </div>
    </Modal>
  );
}
