import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Folder,
  FolderOpen,
  Search,
  Shield,
  FolderPlus,
  ArrowRight,
  X,
} from "lucide-react";
import { type FolderInfo, type FolderTreeNode, buildFolderTree } from "@/lib/types";
import { moveItemToFolder } from "@/lib/tauri";
import { toast } from "sonner";

export interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
  itemTitle: string;
  currentFolder: string | null;
  folders: FolderInfo[];
  onMoved: () => void;
  onOpenFolderManager?: () => void;
}

export function MoveToFolderModal({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  currentFolder,
  folders,
  onMoved,
  onOpenFolderManager,
}: MoveToFolderModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return folders.filter((f) => f.name.toLowerCase().includes(query));
  }, [folders, searchQuery]);

  const handleSelectFolder = async (targetFolder: string | null) => {
    if (!itemId) return;
    if (targetFolder === currentFolder) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await moveItemToFolder(itemId, targetFolder);
      toast.success(
        targetFolder
          ? `Moved "${itemTitle}" to "${targetFolder}"`
          : `Moved "${itemTitle}" to Root Vault`
      );
      onMoved();
      onClose();
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Failed to move item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTreeNode = (node: FolderTreeNode) => {
    const isCurrent = currentFolder === node.name;
    const hasChildren = node.children.length > 0;

    return (
      <React.Fragment key={node.name}>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSelectFolder(node.name)}
          style={{ paddingLeft: `${node.depth * 16 + 12}px` }}
          className={`w-full flex items-center justify-between pr-3 py-2.5 rounded-xl text-left transition-all duration-100 cursor-pointer group ${
            isCurrent
              ? "bg-accent-surface/70 text-accent font-semibold border border-accent-border/50"
              : "hover:bg-surface-2 text-text-secondary hover:text-text-primary"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {node.depth > 0 ? (
              <span className="w-2.5 h-2.5 border-l-2 border-b-2 border-border-default rounded-bl shrink-0 -ml-1 mr-0.5 inline-block opacity-60" />
            ) : null}

            {hasChildren ? (
              <FolderOpen className="w-4.5 h-4.5 text-accent shrink-0" />
            ) : (
              <Folder className="w-4.5 h-4.5 text-text-muted group-hover:text-accent shrink-0 transition-colors" />
            )}

            <div className="min-w-0 flex-1">
              <div className="text-sm truncate font-medium flex items-center gap-2">
                <span>{node.displayName}</span>
                {isCurrent && (
                  <span className="text-3xs font-mono px-1.5 py-0.2 rounded bg-accent/20 text-accent font-bold">
                    Current
                  </span>
                )}
              </div>
              {node.depth > 0 && (
                <div className="text-3xs text-text-muted truncate">
                  in {node.name.split("/").slice(0, -1).join(" / ")}
                </div>
              )}
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </button>

        {node.children.map((child) => renderTreeNode(child))}
      </React.Fragment>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move Item to Folder"
      maxWidth="sm"
    >
      <div className="space-y-4">
        {/* Item Target Preview */}
        <div className="p-3 bg-surface-2/60 border border-border-default/70 rounded-2xl flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-3xs uppercase font-bold text-text-muted tracking-wider mb-0.5">
              Target Item
            </div>
            <div className="text-sm font-bold text-text-primary truncate">
              {itemTitle}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-3xs uppercase font-bold text-text-muted tracking-wider mb-0.5">
              Current Location
            </div>
            <div className="text-xs font-semibold text-accent truncate max-w-[140px]">
              {currentFolder || "Root Vault"}
            </div>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search destination folders..."
            autoFocus
            className="w-full h-9 bg-surface-1 border border-border-default rounded-xl pl-9 pr-8 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tree List */}
        <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-1 border border-border-subtle rounded-2xl p-1.5 bg-surface-1/50">
          {/* Root Option */}
          {!searchQuery && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSelectFolder(null)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-100 cursor-pointer group mb-1 border-b border-border-subtle/70 ${
                currentFolder === null
                  ? "bg-accent-surface/70 text-accent font-semibold border border-accent-border/50"
                  : "hover:bg-surface-2 text-text-secondary hover:text-text-primary"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Shield className="w-4.5 h-4.5 text-text-muted group-hover:text-accent shrink-0" />
                <div>
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    <span>No Folder (Root Vault)</span>
                    {currentFolder === null && (
                      <span className="text-3xs font-mono px-1.5 py-0.2 rounded bg-accent/20 text-accent font-bold">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-3xs text-text-muted">Keep directly in vault root</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>
          )}

          {filteredFolders ? (
            filteredFolders.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted">
                No matching folders found for "{searchQuery}"
              </div>
            ) : (
              filteredFolders.map((f) => {
                const isCurrent = currentFolder === f.name;
                const parts = f.name.split("/");
                const title = parts[parts.length - 1];
                const path = parts.length > 1 ? parts.slice(0, -1).join(" / ") : null;

                return (
                  <button
                    key={f.name}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSelectFolder(f.name)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-100 cursor-pointer group ${
                      isCurrent
                        ? "bg-accent-surface/70 text-accent font-semibold border border-accent-border/50"
                        : "hover:bg-surface-2 text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Folder className="w-4.5 h-4.5 text-text-muted group-hover:text-accent shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate flex items-center gap-2">
                          <span>{title}</span>
                          {isCurrent && (
                            <span className="text-3xs font-mono px-1.5 py-0.2 rounded bg-accent/20 text-accent font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        {path && (
                          <div className="text-3xs text-text-muted truncate font-mono">
                            in {path}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                );
              })
            )
          ) : folders.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted space-y-2">
              <Folder className="w-8 h-8 text-surface-3 mx-auto" />
              <p>No folders created yet.</p>
            </div>
          ) : (
            folderTree.map((rootNode) => renderTreeNode(rootNode))
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          {onOpenFolderManager ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                onOpenFolderManager();
              }}
              className="text-xs text-accent hover:text-accent font-semibold"
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
              + Create New Folder
            </Button>
          ) : (
            <div />
          )}

          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
