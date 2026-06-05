import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["Bahnschrift", "\"Segoe UI Variable Text\"", "\"Microsoft YaHei UI\"", "sans-serif"],
        display: ["\"Segoe UI Variable Display\"", "Bahnschrift", "\"Microsoft YaHei UI\"", "sans-serif"],
        mono: ["Consolas", "\"Cascadia Code\"", "monospace"],
      },
      boxShadow: {
        panel: "0 22px 80px rgba(15, 23, 42, 0.18)",
        soft: "0 8px 30px rgba(15, 23, 42, 0.08)",
      }
    },
  },
  plugins: [],
} satisfies Config;
