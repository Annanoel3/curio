import React, { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function TagInput({ tags = [], onChange }) {
  const [input, setInput] = useState("");

  const addTag = (raw) => {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (tags.includes(t)) return;
    onChange([...tags, t]);
    setInput("");
  };

  const removeTag = (t) => {
    onChange(tags.filter((x) => x !== t));
  };

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <Badge
            key={t}
            variant="secondary"
            className="rounded-full gap-1 pl-3 pr-1.5 py-1 font-normal"
          >
            {t}
            <button
              onClick={() => removeTag(t)}
              className="ml-0.5 hover:bg-background/60 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => addTag(input)}
        placeholder="Add a tag and press Enter…"
      />
    </div>
  );
}