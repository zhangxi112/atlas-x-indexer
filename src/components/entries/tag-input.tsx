import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/shared/badge";
import { Input } from "@/components/shared/input";
import { Button } from "@/components/shared/button";

export function TagInput({
  value,
  suggestions,
  onChange,
}: {
  value: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function pushTag(next: string) {
    const normalized = next.trim();
    if (!normalized || value.includes(normalized)) return;
    onChange([...value, normalized]);
    setInput("");
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-background/70 p-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              pushTag(input);
            }
          }}
          placeholder="输入标签后按 Enter"
        />
        <Button variant="outline" onClick={() => pushTag(input)}>
          添加
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge key={tag} className="gap-1 bg-primary/10 text-primary">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((item) => item !== tag))}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {suggestions.length ? (
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              onClick={() => pushTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
