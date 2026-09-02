import { create } from "zustand";
import type { ItemType } from "@/lib/types";

interface AppState {
  // Navigation & View State
  selectedItemId: string | null;
  selectedCategory: string | null; // null = all, or ItemType, "favorites", "trash"
  selectedTag: string | null;
  searchQuery: string;
  isSidebarCollapsed: boolean;

  // Active Modals & Overlays
  isCommandPaletteOpen: boolean;
  isGeneratorOpen: boolean;
  isItemModalOpen: boolean;
  isSettingsOpen: boolean;
  itemModalMode: "create" | "edit";
  itemModalType: ItemType;

  // Theme
  theme: "dark" | "light";

  // Actions
  setSelectedItemId: (id: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedTag: (tag: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setGeneratorOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  openCreateItemModal: (type?: ItemType) => void;
  openEditItemModal: (id: string) => void;
  closeItemModal: () => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedItemId: null,
  selectedCategory: null,
  selectedTag: null,
  searchQuery: "",
  isSidebarCollapsed: false,

  isCommandPaletteOpen: false,
  isGeneratorOpen: false,
  isSettingsOpen: false,
  isItemModalOpen: false,
  itemModalMode: "create",
  itemModalType: "login",

  theme: (typeof window !== "undefined" && localStorage.getItem("kobean_theme") === "light")
    ? "light"
    : "dark",

  setSelectedItemId: (id) => set({ selectedItemId: id }),
  setSelectedCategory: (category) => set({ selectedCategory: category, selectedTag: null, selectedItemId: null }),
  setSelectedTag: (tag) => set({ selectedTag: tag, selectedCategory: null, selectedItemId: null }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
  setGeneratorOpen: (isGeneratorOpen) => set({ isGeneratorOpen }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),

  openCreateItemModal: (type = "login") =>
    set({ isItemModalOpen: true, itemModalMode: "create", itemModalType: type }),

  openEditItemModal: (id) =>
    set({ isItemModalOpen: true, itemModalMode: "edit", selectedItemId: id }),

  closeItemModal: () => set({ isItemModalOpen: false }),

  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("kobean_theme", theme);
      if (theme === "light") {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      }
    }
    set({ theme });
  },

  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("kobean_theme", nextTheme);
        if (nextTheme === "light") {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        } else {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        }
      }
      return { theme: nextTheme };
    });
  },
}));
