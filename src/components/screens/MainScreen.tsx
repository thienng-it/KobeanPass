import { useState, useEffect, useMemo } from "react";
import {
  Shield,
  KeyRound,
  FileText,
  CreditCard,
  Star,
  Trash2,
  Lock,
  Plus,
  Sparkles,
  Search,
  Moon,
  Sun,
  Settings,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderKanban,
  X,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Edit2,
  FilePlus,
  FolderInput,
  Columns2,
  Columns3,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/stores/appStore";
import {
  listItems,
  searchItems,
  lockVault,
  listFolders,
  renameFolder,
  deleteFolder,
  moveItemToFolder,
  getItem,
  getTotpCode,
  toggleFavorite,
  trashItem,
  copySecure,
} from "@/lib/tauri";
import { type ItemSummary, type FolderInfo, type FolderTreeNode, buildFolderTree } from "@/lib/types";
import { ItemDetailView } from "@/components/vault/ItemDetailView";
import { ItemFormModal } from "@/components/vault/ItemFormModal";
import { FolderManagerModal } from "@/components/folders/FolderManagerModal";
import { MoveToFolderModal } from "@/components/folders/MoveToFolderModal";
import { PasswordGeneratorModal } from "@/components/generator/PasswordGeneratorModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { fitPaneWidths } from "@/lib/paneSizing";
import {
  defaultPaneVisibility,
  togglePaneVisibility,
  type PaneId,
} from "@/lib/paneVisibility";
import { toast } from "sonner";

interface MainScreenProps {
  onLocked: () => void;
}

export function MainScreen({ onLocked }: MainScreenProps) {
  const {
    selectedItemId,
    setSelectedItemId,
    selectedCategory,
    setSelectedCategory,
    selectedTag,
    setSelectedTag,
    isGeneratorOpen,
    setGeneratorOpen,
    isSettingsOpen,
    setSettingsOpen,
    isItemModalOpen,
    closeItemModal,
    openCreateItemModal,
    openEditItemModal,
    theme,
    toggleTheme,
  } = useAppStore();

  const [items, setItems] = useState<ItemSummary[]>([]);
  const [allItems, setAllItems] = useState<ItemSummary[]>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [folderManagerParent, setFolderManagerParent] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Section Collapse State
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState(false);
  const [itemModalInitialTag, setItemModalInitialTag] = useState<string | null>(null);

  const handleOpenAddSubfolder = (parentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderManagerParent(parentName);
    setIsFolderManagerOpen(true);
  };

  const handleOpenAddItemInFolder = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemModalInitialTag(folderName);
    openCreateItemModal("login");
  };

  // Hierarchical Folder Tree & Expansion State
  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Auto-expand all parent folders when folders update
  useEffect(() => {
    if (folders.length > 0) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        folders.forEach((f) => {
          const parts = f.name.split("/");
          let acc = "";
          for (let i = 0; i < parts.length - 1; i++) {
            acc = acc ? `${acc}/${parts[i]}` : parts[i];
            next.add(acc);
          }
        });
        return next;
      });
    }
  }, [folders]);

  const toggleFolderExpanded = (name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Inline Quick Rename & Delete State
  const [editingFolderName, setEditingFolderName] = useState<string | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState<string>("");

  const handleStartRename = (node: FolderTreeNode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingFolderName(node.name);
    setEditingDisplayName(node.displayName);
  };

  const handleSaveRename = async (node: FolderTreeNode) => {
    const trimmed = editingDisplayName.trim();
    if (!trimmed || trimmed === node.displayName) {
      setEditingFolderName(null);
      return;
    }

    const parts = node.name.split("/");
    parts[parts.length - 1] = trimmed;
    const newFullPath = parts.join("/");

    try {
      await renameFolder(node.name, newFullPath);
      toast.success(`Folder renamed to "${trimmed}"`);
      if (selectedTag === node.name) {
        setSelectedTag(newFullPath);
      }
      setEditingFolderName(null);
      await fetchFolders();
      await fetchItems();
      await fetchAllItems();
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Failed to rename folder");
    }
  };

  const [deletingFolderName, setDeletingFolderName] = useState<string | null>(null);

  const handleDeleteFolder = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingFolderName(folderName);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deletingFolderName) return;
    try {
      await deleteFolder(deletingFolderName);
      toast.success(`Folder "${deletingFolderName}" deleted`);
      if (selectedTag === deletingFolderName || selectedTag?.startsWith(deletingFolderName + "/")) {
        setSelectedTag(null);
      }
      setDeletingFolderName(null);
      await fetchFolders();
      await fetchItems();
      await fetchAllItems();
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : "Failed to delete folder");
    }
  };

  // Drag-and-Drop and Move to Folder State
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [movingItem, setMovingItem] = useState<{
    id: string;
    title: string;
    currentFolder: string | null;
  } | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number } | null;
    items: ContextMenuItem[];
  }>({
    position: null,
    items: [],
  });

  const handleCloseContextMenu = () => {
    setContextMenu({ position: null, items: [] });
  };

  const handleFolderContextMenu = (node: FolderTreeNode, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      items: [
        {
          label: `New Item in "${node.displayName}"`,
          icon: <FilePlus className="w-4 h-4" />,
          onClick: () => handleOpenAddItemInFolder(node.name, e),
        },
        {
          label: "Add Subfolder",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => handleOpenAddSubfolder(node.name, e),
        },
        {
          label: "Rename Folder",
          icon: <Edit2 className="w-4 h-4" />,
          shortcut: "Double Click",
          onClick: () => handleStartRename(node),
        },
        { divider: true },
        {
          label: "Delete Folder",
          icon: <Trash2 className="w-4 h-4" />,
          variant: "danger",
          onClick: () => handleDeleteFolder(node.name, e),
        },
      ],
    });
  };

  const handleItemContextMenu = (item: ItemSummary, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItemId(item.id);

    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      items: [
        {
          label: "Edit Credential",
          icon: <Edit2 className="w-4 h-4" />,
          onClick: () => openEditItemModal(item.id),
        },
        {
          label: "Move to Folder...",
          icon: <FolderInput className="w-4 h-4" />,
          onClick: () => {
            setMovingItem({
              id: item.id,
              title: item.title,
              currentFolder: item.tags && item.tags[0] ? item.tags[0] : null,
            });
          },
        },
        {
          label: item.is_favorite ? "Remove from Favorites" : "Add to Favorites",
          icon: <Star className={`w-4 h-4 ${item.is_favorite ? "fill-warning-text text-warning-text" : ""}`} />,
          onClick: async () => {
            try {
              await toggleFavorite(item.id);
              fetchItems();
              fetchAllItems();
            } catch {}
          },
        },
        {
          label: "Copy Password",
          icon: <KeyRound className="w-4 h-4" />,
          shortcut: "⌘C",
          onClick: async () => {
            try {
              const full = await getItem(item.id);
              if (full.payload.type === "login" && full.payload.data.password) {
                await copySecure(full.payload.data.password);
                toast.success("Password copied to secure clipboard (clears in 30s)");
              } else if (full.payload.type === "credit_card" && full.payload.data.number) {
                await copySecure(full.payload.data.number);
                toast.success("Card number copied (clears in 30s)");
              } else {
                toast.info("No password available for this item");
              }
            } catch {
              toast.error("Failed to copy password");
            }
          },
        },
        ...(item.item_type === "login" || item.item_type === "otp"
          ? [
              {
                label: "Copy 2FA Code",
                icon: <ShieldCheck className="w-4 h-4" />,
                onClick: async () => {
                  try {
                    const code = await getTotpCode(item.id);
                    await copySecure(code.code);
                    toast.success("2FA code copied to clipboard!");
                  } catch {
                    toast.error("No 2FA configured for this item");
                  }
                },
              },
            ]
          : []),
        { divider: true },
        {
          label: "Move to Trash",
          icon: <Trash2 className="w-4 h-4" />,
          variant: "danger",
          onClick: async () => {
            try {
              await trashItem(item.id);
              toast.success("Moved to Trash");
              if (selectedItemId === item.id) setSelectedItemId(null);
              fetchItems();
              fetchAllItems();
            } catch (err: any) {
              toast.error(typeof err === "string" ? err : "Failed to trash item");
            }
          },
        },
      ],
    });
  };

  const handleGlobalContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a") || target.closest("[data-custom-context]")) {
      return;
    }
    e.preventDefault();

    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      items: [
        {
          label: "New Item",
          icon: <Plus className="w-4 h-4" />,
          shortcut: "⌘N",
          onClick: () => {
            setItemModalInitialTag(selectedTag || null);
            openCreateItemModal("login");
          },
        },
        {
          label: "New Folder / Project",
          icon: <FolderPlus className="w-4 h-4" />,
          onClick: () => setIsFolderManagerOpen(true),
        },
        {
          label: "Password Generator",
          icon: <Sparkles className="w-4 h-4" />,
          onClick: () => setGeneratorOpen(true),
        },
        { divider: true },
        {
          label: "Lock Vault",
          icon: <Lock className="w-4 h-4" />,
          shortcut: "⌘L",
          onClick: handleLock,
        },
      ],
    });
  };

  // Resizable Panes State with optimal launch defaults
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("kobean_sidebar_width");
    return saved ? Math.max(160, Math.min(340, Number(saved))) : 220;
  });
  const [listWidth, setListWidth] = useState(() => {
    const saved = localStorage.getItem("kobean_list_width");
    return saved ? Math.max(200, Math.min(420, Number(saved))) : 280;
  });
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingList, setIsDraggingList] = useState(false);
  const [visiblePanes, setVisiblePanes] = useState(defaultPaneVisibility);
  const paneWidths = fitPaneWidths(viewportWidth, sidebarWidth, listWidth);
  const isSidebarVisible = paneWidths.isNarrowLayout || visiblePanes.sidebar;
  const isListVisible = paneWidths.isNarrowLayout ? !selectedItemId : visiblePanes.list;
  const isDetailVisible = paneWidths.isNarrowLayout ? Boolean(selectedItemId) : visiblePanes.detail;
  const isListExpanded = paneWidths.isNarrowLayout || !visiblePanes.detail;
  const visiblePaneCount = Object.values(visiblePanes).filter(Boolean).length;

  const handleTogglePane = (pane: PaneId) => {
    setVisiblePanes((current) => togglePaneVisibility(current, pane));
  };

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
    const startX = e.clientX;
    const startWidth = paneWidths.sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.min(Math.max(startWidth + (moveEvent.clientX - startX), 160), 340);
      setSidebarWidth(newWidth);
      localStorage.setItem("kobean_sidebar_width", String(newWidth));
    };

    const onMouseUp = () => {
      setIsDraggingSidebar(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleListMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingList(true);
    const startX = e.clientX;
    const startWidth = paneWidths.listWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.min(Math.max(startWidth + (moveEvent.clientX - startX), 200), 420);
      setListWidth(newWidth);
      localStorage.setItem("kobean_list_width", String(newWidth));
    };

    const onMouseUp = () => {
      setIsDraggingList(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Fetch all items to compute category counts and unique tags
  const fetchAllItems = async () => {
    try {
      const fullList = await listItems();
      setAllItems(fullList);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFolders = async () => {
    try {
      const list = await listFolders();
      setFolders(list);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchItems = async () => {
    try {
      if (searchQuery.trim()) {
        const res = await searchItems(searchQuery);
        setItems(res);
      } else if (selectedTag) {
        const res = await listItems(undefined, selectedTag);
        setItems(res);
      } else {
        const res = await listItems(selectedCategory || undefined);
        setItems(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllItems();
    fetchFolders();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory, selectedTag, searchQuery]);

  const handleLock = async () => {
    try {
      await lockVault();
      toast.success("Vault locked");
      onLocked();
    } catch {
      toast.error("Failed to lock vault");
    }
  };

  // Compute category counts
  const categoryCounts = {
    all: allItems.length,
    login: allItems.filter((i) => i.item_type === "login").length,
    otp: allItems.filter((i) => i.item_type === "otp").length,
    secure_note: allItems.filter((i) => i.item_type === "secure_note").length,
    credit_card: allItems.filter((i) => i.item_type === "credit_card").length,
    favorites: allItems.filter((i) => i.is_favorite).length,
    trash: 0,
  };

  const categories = [
    { id: null, label: "All Items", icon: Shield, count: categoryCounts.all },
    { id: "login", label: "Logins", icon: KeyRound, count: categoryCounts.login },
    { id: "otp", label: "2FA / OTP", icon: ShieldCheck, count: categoryCounts.otp },
    { id: "secure_note", label: "Secure Notes", icon: FileText, count: categoryCounts.secure_note },
    { id: "credit_card", label: "Credit Cards", icon: CreditCard, count: categoryCounts.credit_card },
    { id: "favorites", label: "Favorites", icon: Star, count: categoryCounts.favorites },
    { id: "trash", label: "Trash", icon: Trash2, count: categoryCounts.trash },
  ];

  const renderSidebarFolderNode = (node: FolderTreeNode) => {
    const isActive = selectedTag === node.name;
    const isDragTarget = dragOverFolder === node.name;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolders.has(node.name);
    const isEditing = editingFolderName === node.name;

    return (
      <div key={node.name} className="space-y-0.5">
        <div
          onClick={() => {
            if (!isEditing) {
              setSelectedCategory(null);
              setSelectedTag(node.name);
              if (hasChildren) {
                toggleFolderExpanded(node.name);
              }
            }
          }}
          onContextMenu={(e) => handleFolderContextMenu(node, e)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleStartRename(node);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragOverFolder !== node.name) {
              setDragOverFolder(node.name);
            }
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            if (dragOverFolder === node.name) {
              setDragOverFolder(null);
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const itemId = e.dataTransfer.getData("application/kobean-item-id") || draggingItemId;
            const itemTitle = e.dataTransfer.getData("application/kobean-item-title") || "Item";
            setDragOverFolder(null);
            setDraggingItemId(null);
            if (!itemId) return;

            try {
              await moveItemToFolder(itemId, node.name);
              toast.success(`Moved "${itemTitle}" to "${node.displayName}"`);
              await fetchFolders();
              await fetchItems();
              await fetchAllItems();
            } catch (err: any) {
              toast.error(typeof err === "string" ? err : "Failed to move item");
            }
          }}
          style={{ paddingLeft: `${node.depth * 14 + 14}px` }}
          className={`w-full flex items-center justify-between pr-2.5 py-1.5 rounded-xl text-sm transition-all cursor-pointer group select-none ${
            isDragTarget
              ? "ring-2 ring-accent bg-accent-surface text-accent font-bold scale-[1.02] shadow-sm border border-accent"
              : isActive
              ? "bg-accent-surface text-accent font-bold border border-accent-border shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-2 font-medium border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <span
                onClick={(e) => toggleFolderExpanded(node.name, e)}
                className="p-0.5 -ml-1 rounded hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
            ) : node.depth > 0 ? (
              <span className="w-2.5 h-2.5 border-l-2 border-b-2 border-border-default/60 rounded-bl shrink-0 -ml-1 mr-0.5 inline-block" />
            ) : null}

            {hasChildren && isExpanded ? (
              <FolderOpen className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-accent" : "text-text-muted"}`} />
            ) : (
              <Folder className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-accent" : "text-text-muted"}`} />
            )}

            {isEditing ? (
              <input
                type="text"
                value={editingDisplayName}
                onChange={(e) => setEditingDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename(node);
                  if (e.key === "Escape") setEditingFolderName(null);
                }}
                onBlur={() => handleSaveRename(node)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                className="h-6 px-1.5 py-0.5 text-xs bg-surface-0 border border-accent rounded-md text-text-primary focus:outline-none flex-1 min-w-0"
              />
            ) : (
              <span
                className="truncate text-left flex-1"
                title="Double-click to rename"
              >
                {node.displayName}
              </span>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-0.5 shrink-0 ml-1">
              {/* Hover Actions: + Subfolder, + Item in folder, Edit / Rename, Delete */}
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => handleOpenAddItemInFolder(node.name, e)}
                  className="p-1 rounded-md hover:bg-surface-3 text-text-muted hover:text-accent transition-colors cursor-pointer"
                  title={`Add new credential to "${node.displayName}"`}
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleOpenAddSubfolder(node.name, e)}
                  className="p-1 rounded-md hover:bg-surface-3 text-text-muted hover:text-accent transition-colors cursor-pointer"
                  title={`Add subfolder inside "${node.displayName}"`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleStartRename(node, e)}
                  className="p-1 rounded-md hover:bg-surface-3 text-text-muted hover:text-accent transition-colors cursor-pointer"
                  title={`Rename "${node.displayName}" (or double-click)`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteFolder(node.name, e)}
                  className="p-1 rounded-md hover:bg-surface-3 text-text-muted hover:text-danger-text transition-colors cursor-pointer"
                  title={`Delete "${node.displayName}"`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Count badge (visible when not hovered) */}
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded-md group-hover:hidden ${
                  isActive ? "bg-accent text-white font-bold" : "text-text-muted font-medium"
                }`}
              >
                {node.total_item_count}
              </span>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderSidebarFolderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onContextMenu={handleGlobalContextMenu}
      className="relative h-screen w-screen flex flex-col bg-surface-0 text-text-primary overflow-hidden"
    >
      {/* 3-Pane Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Pane 1: Sidebar */}
        {isSidebarVisible && (
          <aside
          style={{ width: `${paneWidths.sidebarWidth}px` }}
          className={`bg-surface-1 flex flex-col justify-between shrink-0 overflow-x-hidden overflow-y-auto select-none ${
            paneWidths.isSidebarCompact ? "p-2" : "p-3"
          }`}
        >
          <div className={paneWidths.isSidebarCompact ? "space-y-3" : "space-y-4"}>
            {/* App Brand Header */}
            <div className={`flex items-center py-1 ${
              paneWidths.isSidebarCompact ? "justify-center px-0" : "justify-between px-2"
            }`}>
              <div className={`flex items-center ${paneWidths.isSidebarCompact ? "gap-0" : "gap-2.5"}`}>
                <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center shadow-xs">
                  <Shield className="w-4.5 h-4.5" />
                </div>
                {!paneWidths.isSidebarCompact && (
                  <span className="font-bold text-base tracking-tight">KobeanPass</span>
                )}
              </div>
              {!paneWidths.isSidebarCompact && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  title="Toggle Theme"
                >
                  {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                </Button>
              )}
            </div>

            {/* Quick Action: New Item */}
            <Button
              variant="primary"
              size="md"
              className={`w-full h-10 font-semibold shadow-xs ${
                paneWidths.isSidebarCompact ? "justify-center px-0" : "justify-start text-sm"
              }`}
              aria-label="New Item"
              title="New Item"
              onClick={() => {
                setItemModalInitialTag(selectedTag || null);
                openCreateItemModal("login");
              }}
            >
              <Plus className={`w-4.5 h-4.5 ${paneWidths.isSidebarCompact ? "" : "mr-2"}`} />
              {!paneWidths.isSidebarCompact && "New Item"}
            </Button>

            {/* Folders & Projects Navigation (Placed at Top) */}
            <div>
              <div className={`flex items-center mb-1.5 ${
                paneWidths.isSidebarCompact ? "justify-center px-0" : "justify-between px-3"
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    if (paneWidths.isSidebarCompact) {
                      setIsFolderManagerOpen(true);
                    } else {
                      setIsFoldersCollapsed(!isFoldersCollapsed);
                    }
                  }}
                  className={`font-bold text-text-muted hover:text-text-primary uppercase tracking-wider flex items-center cursor-pointer select-none transition-colors ${
                    paneWidths.isSidebarCompact ? "p-2 rounded-xl hover:bg-surface-2" : "text-xs gap-1.5"
                  }`}
                  aria-label="Manage Folders & Projects"
                  title="Manage Folders & Projects"
                >
                  {!paneWidths.isSidebarCompact && (isFoldersCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ))}
                  <FolderKanban className="w-4 h-4 text-accent" />
                  {!paneWidths.isSidebarCompact && <span>Folders & Projects</span>}
                </button>
                {!paneWidths.isSidebarCompact && (
                  <button
                    onClick={() => setIsFolderManagerOpen(true)}
                    className="p-1 hover:bg-surface-3 rounded-md text-text-muted hover:text-accent transition-colors cursor-pointer"
                    title="Manage Folders & Projects"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!paneWidths.isSidebarCompact && !isFoldersCollapsed && (
                <div>
                  {folders.length === 0 ? (
                    <button
                      onClick={() => setIsFolderManagerOpen(true)}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-text-muted hover:text-accent hover:bg-surface-2 transition-colors border border-dashed border-border-subtle flex items-center gap-2 cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4 text-accent" />
                      <span>+ New Folder / Project</span>
                    </button>
                  ) : (
                    <div className="space-y-0.5">
                      {folderTree.map((rootNode) => renderSidebarFolderNode(rootNode))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Categories Navigation (Moved below Folders & Projects) */}
            <div className={`${paneWidths.isSidebarCompact ? "pt-2" : "pt-2.5"} border-t border-border-subtle`}>
              {!paneWidths.isSidebarCompact && (
                <div className="px-3 mb-1.5">
                <button
                  type="button"
                  onClick={() => setIsCategoriesCollapsed(!isCategoriesCollapsed)}
                  className="text-xs font-bold text-text-muted hover:text-text-primary uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none transition-colors"
                >
                  {isCategoriesCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  <span>Categories</span>
                </button>
                </div>
              )}

              {(!isCategoriesCollapsed || paneWidths.isSidebarCompact) && (
                <nav className="space-y-1">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id && !selectedTag;
                    const isDropTarget = cat.id === null && dragOverFolder === "__root__";

                    return (
                      <button
                        key={cat.label}
                        onClick={() => {
                          setSelectedTag(null);
                          setSelectedCategory(cat.id);
                        }}
                        onDragOver={(e) => {
                          if (cat.id === null) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverFolder !== "__root__") {
                              setDragOverFolder("__root__");
                            }
                          }
                        }}
                        onDragLeave={(e) => {
                          if (cat.id === null) {
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            if (dragOverFolder === "__root__") {
                              setDragOverFolder(null);
                            }
                          }
                        }}
                        onDrop={async (e) => {
                          if (cat.id === null) {
                            e.preventDefault();
                            e.stopPropagation();
                            const itemId = e.dataTransfer.getData("application/kobean-item-id") || draggingItemId;
                            const itemTitle = e.dataTransfer.getData("application/kobean-item-title") || "Item";
                            setDragOverFolder(null);
                            setDraggingItemId(null);
                            if (!itemId) return;

                            try {
                              await moveItemToFolder(itemId, null);
                              toast.success(`Moved "${itemTitle}" to Root Vault`);
                              await fetchFolders();
                              await fetchItems();
                              await fetchAllItems();
                            } catch (err: any) {
                              toast.error(typeof err === "string" ? err : "Failed to move item");
                            }
                          }
                        }}
                        aria-label={cat.label}
                        title={cat.label}
                        className={`w-full flex items-center rounded-xl text-sm transition-all cursor-pointer ${
                          paneWidths.isSidebarCompact ? "h-10 justify-center px-0" : "justify-between px-3.5 py-2"
                        } ${
                          isDropTarget
                            ? "ring-2 ring-accent bg-accent-surface text-accent font-bold scale-[1.02] shadow-sm border border-accent"
                            : isActive
                            ? "bg-surface-3 text-text-primary font-bold shadow-xs border border-transparent"
                            : "text-text-secondary hover:text-text-primary hover:bg-surface-2 font-medium border border-transparent"
                        }`}
                      >
                        <div className={`flex items-center ${paneWidths.isSidebarCompact ? "gap-0" : "gap-3"}`}>
                          <Icon className={`w-4.5 h-4.5 ${isActive || isDropTarget ? "text-accent" : "text-text-muted"}`} />
                          {!paneWidths.isSidebarCompact && <span>{cat.label}</span>}
                        </div>
                        {!paneWidths.isSidebarCompact && (
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${
                            isActive ? "bg-accent/15 text-accent font-bold" : "text-text-muted font-medium"
                          }`}>
                            {cat.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>
          </div>

          {/* Sidebar Footer (Generator & Lock) */}
          <div className={`space-y-1 border-t border-border-subtle ${paneWidths.isSidebarCompact ? "pt-2" : "pt-3"}`}>
            <button
              onClick={() => setGeneratorOpen(true)}
              className={`w-full flex items-center rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer ${
                paneWidths.isSidebarCompact ? "h-10 justify-center px-0" : "gap-3 px-3.5 py-2.5"
              }`}
              aria-label="Password Generator"
              title="Password Generator"
            >
              <Sparkles className="w-4.5 h-4.5 text-warning-text" />
              {!paneWidths.isSidebarCompact && <span>Password Generator</span>}
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className={`w-full flex items-center rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer ${
                paneWidths.isSidebarCompact ? "h-10 justify-center px-0" : "gap-3 px-3.5 py-2.5"
              }`}
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-4.5 h-4.5 text-accent" />
              {!paneWidths.isSidebarCompact && <span>Settings</span>}
            </button>

            {paneWidths.isSidebarCompact && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="w-full h-10 rounded-xl"
                aria-label="Toggle Theme"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </Button>
            )}

            <button
              onClick={handleLock}
              className={`w-full flex items-center rounded-xl text-sm font-medium text-danger-text hover:bg-danger-surface transition-colors cursor-pointer ${
                paneWidths.isSidebarCompact ? "h-10 justify-center px-0" : "gap-3 px-3.5 py-2.5"
              }`}
              aria-label="Lock Vault"
              title="Lock Vault"
            >
              <Lock className="w-4.5 h-4.5" />
              {!paneWidths.isSidebarCompact && <span>Lock Vault (⌘L)</span>}
            </button>
          </div>
          </aside>
        )}

        {!paneWidths.isNarrowLayout && isSidebarVisible && isListVisible && (
          <div
            onMouseDown={handleSidebarMouseDown}
            className={`w-1.5 hover:w-2 active:w-2 relative z-30 cursor-col-resize transition-all duration-150 select-none flex items-center justify-center shrink-0 group ${
              isDraggingSidebar ? "bg-accent" : "bg-border-default hover:bg-accent/80"
            }`}
            title="Drag to resize sidebar"
          >
            <div className="w-0.5 h-6 rounded-full bg-border-strong group-hover:bg-white/90 transition-colors" />
          </div>
        )}

        {/* Pane 2: Items List */}
        {isListVisible && (
          <section
            style={isListExpanded ? undefined : { width: `${paneWidths.listWidth}px` }}
            className={`bg-surface-1/40 flex flex-col overflow-hidden ${
              isListExpanded ? "flex-1 min-w-0" : "shrink-0"
            }`}
          >
          {/* Search Header */}
          <div className="p-3 border-b border-border-default">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter items..."
                className="w-full h-8 bg-surface-2 border border-border-default rounded-xl pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>

            {/* Active Folder / Project Filter Indicator */}
            {selectedTag && (
              <div className="flex items-center justify-between mt-2 px-2.5 py-1 bg-accent-surface border border-accent-border rounded-xl text-2xs text-accent">
                <span className="flex items-center gap-1.5 font-semibold truncate">
                  <Folder className="w-3.5 h-3.5 shrink-0" /> Folder: {selectedTag}
                </span>
                <button
                  onClick={() => setSelectedTag(null)}
                  className="hover:text-danger-text cursor-pointer p-0.5 rounded-md hover:bg-accent-surface/50 transition-colors shrink-0"
                  title="Clear folder filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* List Scroll */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="text-center py-8 text-xs text-text-muted">Loading items...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 px-4 text-xs text-text-muted">
                No items found. Click <strong>New Item</strong> to create one.
              </div>
            ) : (
              items.map((item) => {
                const isSelected = selectedItemId === item.id;
                const categoryLabel =
                  item.item_type === "login"
                    ? "Login"
                    : item.item_type === "otp"
                    ? "2FA / OTP"
                    : item.item_type === "secure_note"
                    ? "Secure Note"
                    : item.item_type === "credit_card"
                    ? "Credit Card"
                    : item.item_type;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/kobean-item-id", item.id);
                      e.dataTransfer.setData("application/kobean-item-title", item.title);
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingItemId(item.id);
                    }}
                    onDragEnd={() => {
                      setDraggingItemId(null);
                      setDragOverFolder(null);
                    }}
                    onContextMenu={(e) => handleItemContextMenu(item, e)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none flex items-center justify-between gap-2 group ${
                      draggingItemId === item.id
                        ? "opacity-40 scale-[0.98] border-dashed border-accent bg-accent-surface/30"
                        : isSelected
                        ? "bg-surface-3 border-accent text-text-primary shadow-xs"
                        : "bg-surface-2/40 border-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      {/* Line 1: Category Badge & Folder Tag */}
                      <div className="flex items-center gap-1.5 mb-1.5 min-w-0 overflow-hidden">
                        <span className="inline-flex items-center gap-1 text-3xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-3 text-text-secondary border border-border-subtle shrink-0">
                          {item.item_type === "login" && <KeyRound className="w-2.5 h-2.5 text-accent" />}
                          {item.item_type === "otp" && <ShieldCheck className="w-2.5 h-2.5 text-accent" />}
                          {item.item_type === "secure_note" && <FileText className="w-2.5 h-2.5 text-warning-text" />}
                          {item.item_type === "credit_card" && <CreditCard className="w-2.5 h-2.5 text-success-text" />}
                          <span>{categoryLabel}</span>
                        </span>

                        {item.tags && item.tags[0] && (
                          <span className="inline-flex items-center gap-0.5 text-3xs font-medium px-1.5 py-0.5 rounded bg-accent-surface text-accent border border-accent-border truncate">
                            <Folder className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{item.tags[0]}</span>
                          </span>
                        )}
                      </div>

                      {/* Line 2: Title */}
                      <div className="font-semibold text-xs text-text-primary truncate">
                        {item.title}
                      </div>

                      {/* Line 3: Subtitle / Username */}
                      {item.subtitle && (
                        <p className="text-2xs text-text-muted truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>

                    {/* Middle Vertically Centered Favorite Star (Clickable) */}
                    <div
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await toggleFavorite(item.id);
                          fetchItems();
                          fetchAllItems();
                        } catch {}
                      }}
                      className={`shrink-0 p-1.5 rounded-lg hover:bg-surface-3 transition-all cursor-pointer ${
                        item.is_favorite
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                      }`}
                      title={item.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Star
                        className={`w-3.5 h-3.5 transition-colors ${
                          item.is_favorite
                            ? "text-warning-text fill-warning-text"
                            : "text-text-muted hover:text-warning-text"
                        }`}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
          </section>
        )}

        {!paneWidths.isNarrowLayout && isListVisible && isDetailVisible && (
          <div
            onMouseDown={handleListMouseDown}
            className={`w-1.5 hover:w-2 active:w-2 relative z-30 cursor-col-resize transition-all duration-150 select-none flex items-center justify-center shrink-0 group ${
              isDraggingList ? "bg-accent" : "bg-border-default hover:bg-accent/80"
            }`}
            title="Drag to resize item list"
          >
            <div className="w-0.5 h-6 rounded-full bg-border-strong group-hover:bg-white/90 transition-colors" />
          </div>
        )}

        {/* Pane 3: Item Detail */}
        {isDetailVisible && (
          <main className="flex-1 flex flex-col min-w-0 bg-surface-0 overflow-hidden">
          {selectedItemId ? (
            <ItemDetailView
              itemId={selectedItemId}
              onBack={paneWidths.isNarrowLayout ? () => setSelectedItemId(null) : undefined}
              onEdit={() => openEditItemModal(selectedItemId)}
              onItemChanged={() => {
                fetchItems();
                fetchFolders();
                fetchAllItems();
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted">
              <Shield className="w-12 h-12 text-surface-3 mb-3" />
              <h3 className="text-sm font-semibold text-text-secondary">No Item Selected</h3>
              <p className="text-xs text-text-muted mt-1 max-w-xs">
                Select an item from the list to view decrypted details or press <strong>⌘K</strong> for quick search.
              </p>
            </div>
          )}
          </main>
        )}
      </div>

      {!paneWidths.isNarrowLayout && (
        <div
          role="toolbar"
          aria-label="Pane visibility controls"
          className="absolute bottom-3 right-3 z-40 flex items-center gap-1 rounded-xl border border-border-default bg-surface-1 p-1 shadow-sm"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVisiblePanes(defaultPaneVisibility)}
            disabled={visiblePaneCount === 3}
            aria-label="Show all panes"
            title="Show all panes"
          >
            <Columns3 className="w-4 h-4" />
          </Button>
          {[
            { pane: "sidebar" as const, label: "Toggle Navigation Sidebar", icon: PanelLeft },
            { pane: "list" as const, label: "Toggle Item List", icon: Columns2 },
            { pane: "detail" as const, label: "Toggle Detail Pane", icon: PanelRight },
          ].map(({ pane, label, icon: Icon }) => (
            <Button
              key={pane}
              variant="ghost"
              size="icon"
              onClick={() => handleTogglePane(pane)}
              disabled={visiblePanes[pane] && visiblePaneCount === 1}
              aria-label={label}
              aria-pressed={visiblePanes[pane]}
              title={label}
              className={visiblePanes[pane] ? "bg-surface-3 text-text-primary" : "text-text-muted"}
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}
        </div>
      )}

      {/* Global Modals & Overlays */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        initialTag={itemModalInitialTag || selectedTag}
        onClose={() => {
          closeItemModal();
          setItemModalInitialTag(null);
        }}
        onSaved={() => {
          fetchItems();
          fetchFolders();
          fetchAllItems();
          closeItemModal();
          setItemModalInitialTag(null);
        }}
      />

      <FolderManagerModal
        isOpen={isFolderManagerOpen}
        initialParentFolder={folderManagerParent}
        onClose={() => {
          setIsFolderManagerOpen(false);
          setFolderManagerParent("");
        }}
        onSelectFolder={(name) => {
          setSelectedCategory(null);
          setSelectedTag(name);
        }}
        onFoldersChanged={() => {
          fetchFolders();
          fetchItems();
          fetchAllItems();
        }}
      />

      <ConfirmModal
        isOpen={Boolean(deletingFolderName)}
        onClose={() => setDeletingFolderName(null)}
        onConfirm={handleConfirmDeleteFolder}
        title={`Delete "${deletingFolderName}"?`}
        description="Are you sure you want to delete this folder and all its subfolders? Items inside will not be deleted, but will be unlinked from this folder."
        confirmLabel="Delete Folder"
        variant="danger"
      />

      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setGeneratorOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <CommandPalette
        items={items}
        onSelectItem={(id) => {
          setSelectedItemId(id);
        }}
        onLockVault={handleLock}
      />

      <ContextMenu
        isOpen={Boolean(contextMenu.position)}
        position={contextMenu.position}
        onClose={handleCloseContextMenu}
        items={contextMenu.items}
      />

      <MoveToFolderModal
        isOpen={Boolean(movingItem)}
        onClose={() => setMovingItem(null)}
        itemId={movingItem?.id || null}
        itemTitle={movingItem?.title || ""}
        currentFolder={movingItem?.currentFolder || null}
        folders={folders}
        onMoved={async () => {
          await fetchFolders();
          await fetchItems();
          await fetchAllItems();
        }}
        onOpenFolderManager={() => setIsFolderManagerOpen(true)}
      />
    </div>
  );
}
