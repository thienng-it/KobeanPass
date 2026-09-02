import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  ChevronDown,
  Check,
  Search,
  X,
  FolderKanban,
  Shield,
  FolderPlus,
} from "lucide-react";
import { type FolderInfo, type FolderTreeNode, buildFolderTree } from "@/lib/types";

export interface FolderPickerProps {
  value: string | null;
  onChange: (folderName: string | null) => void;
  folders: FolderInfo[];
  onOpenFolderManager?: () => void;
  className?: string;
}

export function FolderPicker({
  value,
  onChange,
  folders,
  onOpenFolderManager,
  className = "",
}: FolderPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Formatted display for selected folder
  const selectedFolderFormatted = useMemo(() => {
    if (!value) return null;
    const parts = value.split("/");
    return {
      title: parts[parts.length - 1],
      path: parts.length > 1 ? parts.slice(0, -1).join(" / ") : null,
      full: value,
    };
  }, [value]);

  // Filtered nodes when searching
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return folders.filter((f) => f.name.toLowerCase().includes(query));
  }, [folders, searchQuery]);

  const handleSelect = (folderName: string | null) => {
    onChange(folderName);
    setIsOpen(false);
  };

  const renderTreeNode = (node: FolderTreeNode) => {
    const isSelected = value === node.name;
    const hasChildren = node.children.length > 0;

    return (
      <React.Fragment key={node.name}>
        <button
          type="button"
          onClick={() => handleSelect(node.name)}
          style={{ paddingLeft: `${node.depth * 16 + 12}px` }}
          className={`w-full flex items-center justify-between pr-3 py-2 rounded-xl text-left transition-all duration-100 cursor-pointer group ${
            isSelected
              ? "bg-accent-surface text-accent font-semibold"
              : "hover:bg-surface-2 text-text-secondary hover:text-text-primary"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {node.depth > 0 ? (
              <span className="w-2.5 h-2.5 border-l-2 border-b-2 border-border-default rounded-bl shrink-0 -ml-1 mr-0.5 inline-block opacity-60" />
            ) : null}

            {isSelected || (hasChildren && isSelected) ? (
              <FolderOpen className="w-4 h-4 text-accent shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-text-muted group-hover:text-accent shrink-0 transition-colors" />
            )}

            <div className="min-w-0 flex-1">
              <div className="text-sm truncate font-medium">{node.displayName}</div>
              {node.depth > 0 && (
                <div className="text-3xs text-text-muted truncate">
                  in {node.name.split("/").slice(0, -1).join(" / ")}
                </div>
              )}
            </div>
          </div>

          {isSelected && <Check className="w-4 h-4 text-accent shrink-0 ml-2" />}
        </button>

        {node.children.map((child) => renderTreeNode(child))}
      </React.Fragment>
    );
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full min-h-10 flex items-center justify-between px-3.5 py-2 rounded-xl bg-surface-1 border transition-all duration-150 cursor-pointer shadow-xs group ${
          isOpen
            ? "border-accent ring-2 ring-accent/20 bg-surface-2/80"
            : "border-border-default hover:border-border-strong hover:bg-surface-2/50"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              value
                ? "bg-accent-surface text-accent"
                : "bg-surface-2 text-text-muted"
            }`}
          >
            {value ? <Folder className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          </div>

          <div className="min-w-0 flex-1 text-left">
            {selectedFolderFormatted ? (
              <div>
                <div className="text-sm font-semibold text-text-primary truncate">
                  {selectedFolderFormatted.title}
                </div>
                {selectedFolderFormatted.path && (
                  <div className="text-3xs text-text-muted truncate font-mono">
                    {selectedFolderFormatted.path}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm font-medium text-text-muted">
                No Folder (Root Vault)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 pl-2 shrink-0">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
              }}
              className="p-1 rounded-md text-text-muted hover:text-danger-text hover:bg-surface-3 transition-colors cursor-pointer"
              title="Clear folder (move to Root)"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}

          <ChevronDown
            className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
              isOpen ? "rotate-180 text-accent" : "group-hover:text-text-primary"
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 p-2 bg-surface-1/98 backdrop-blur-xl border border-border-default rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 origin-top overflow-hidden">
          {/* Search bar inside dropdown */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search folders & projects..."
              className="w-full h-8.5 bg-surface-2 border border-border-default rounded-xl pl-8.5 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Folder List Body */}
          <div className="space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
            {/* Root Option */}
            {!searchQuery && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-100 cursor-pointer group mb-1 border-b border-border-subtle/70 ${
                  value === null
                    ? "bg-accent-surface text-accent font-semibold"
                    : "hover:bg-surface-2 text-text-secondary hover:text-text-primary"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Shield className="w-4 h-4 text-text-muted group-hover:text-accent shrink-0" />
                  <span className="text-sm font-medium truncate">
                    No Folder (Root Vault)
                  </span>
                </div>
                {value === null && <Check className="w-4 h-4 text-accent shrink-0 ml-2" />}
              </button>
            )}

            {/* When Searching */}
            {filteredFolders ? (
              filteredFolders.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-muted">
                  No matching folders found for "{searchQuery}"
                </div>
              ) : (
                filteredFolders.map((f) => {
                  const isSelected = value === f.name;
                  const parts = f.name.split("/");
                  const title = parts[parts.length - 1];
                  const path = parts.length > 1 ? parts.slice(0, -1).join(" / ") : null;

                  return (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => handleSelect(f.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-100 cursor-pointer group ${
                        isSelected
                          ? "bg-accent-surface text-accent font-semibold"
                          : "hover:bg-surface-2 text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Folder className="w-4 h-4 text-text-muted group-hover:text-accent shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{title}</div>
                          {path && (
                            <div className="text-3xs text-text-muted truncate font-mono">
                              in {path}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-accent shrink-0 ml-2" />}
                    </button>
                  );
                })
              )
            ) : folders.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-muted space-y-1">
                <FolderKanban className="w-6 h-6 text-surface-3 mx-auto" />
                <p>No folders created yet.</p>
              </div>
            ) : (
              folderTree.map((rootNode) => renderTreeNode(rootNode))
            )}
          </div>

          {/* Footer: Manage / Create Folder Action */}
          {onOpenFolderManager && (
            <div className="pt-2 mt-1.5 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenFolderManager();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-accent hover:bg-accent-surface transition-colors cursor-pointer border border-dashed border-accent-border/50"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Create or Manage Folders</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
