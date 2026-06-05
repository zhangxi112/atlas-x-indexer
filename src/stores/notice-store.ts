import { create } from "zustand";

interface Notice {
  type: "success" | "error" | "info";
  message: string;
}

interface NoticeState {
  notice: Notice | null;
  show: (notice: Notice) => void;
  clear: () => void;
}

export const useNoticeStore = create<NoticeState>((set) => ({
  notice: null,
  show: (notice) => set({ notice }),
  clear: () => set({ notice: null }),
}));
