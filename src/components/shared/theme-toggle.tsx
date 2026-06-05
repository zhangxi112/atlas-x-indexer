import { MoonStar, SunMedium } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/shared/button";

export function ThemeToggle() {
  const { theme, setTheme } = useUiStore();
  const isDark = theme === "dark" || (theme === "system" && document.documentElement.classList.contains("dark"));

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      {isDark ? "\u6d45\u8272" : "\u6df1\u8272"}
    </Button>
  );
}