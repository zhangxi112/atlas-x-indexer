import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: [
        "**/.cargo-local/**",
        "**/.rustup-local/**",
        "**/src-tauri/target/**",
        "**/.tools/**",
      ],
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          tauri: [
            "@tauri-apps/api",
            "@tauri-apps/plugin-clipboard-manager",
            "@tauri-apps/plugin-dialog",
            "@tauri-apps/plugin-fs",
            "@tauri-apps/plugin-opener",
          ],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          xlsx: ["xlsx"],
          ui: ["lucide-react", "zustand", "class-variance-authority", "clsx", "tailwind-merge"],
        },
      },
    },
  },
  clearScreen: false,
});
