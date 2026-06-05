import { create } from "zustand";
import { applyTheme, getStoredTheme, type ThemeMode } from "@/lib/theme";

interface UiState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: getStoredTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));
