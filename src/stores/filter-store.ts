import { create } from "zustand";
import type { EntryFilters } from "@/types/models";

export const defaultFilters: EntryFilters = {
  query: "",
  tags: [],
  favoritesOnly: false,
  sortBy: "updated_at",
  sortOrder: "desc",
  page: 1,
  pageSize: 20,
  viewMode: "table",
};

interface FilterState {
  filters: EntryFilters;
  setFilters: (updater: Partial<EntryFilters>) => void;
  resetFilters: () => void;
}

export const useEntryFilterStore = create<FilterState>((set) => ({
  filters: defaultFilters,
  setFilters: (updater) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...updater,
      },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
}));
