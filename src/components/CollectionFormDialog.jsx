import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ImageUpload from "@/components/ImageUpload";

const SUGGESTED = ["toy cars", "vinyl records", "coins", "trading cards", "pots", "watches", "stamps", "comics", "figurines"];

export default function CollectionFormDialog({ open, onOpenChange, onSubmit, initial }) {
  const [data, setData] = useState({ name: "", type: "", description: "", cover_image_url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setData(initial || { name: "", type: "", description: "", cover_image_url: "" });
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!data.name.trim() || !data.type.trim()) return;
    setSaving(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {initial ? "Edit collection" : "New collection"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              I'm a…
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={data.type}
                onChange={(e) => setData({ ...data, type: e.target.value })}
                placeholder="toy car collector"
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">collector</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setData({ ...data, type: s })}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              Collection name
            </Label>
            <Input
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              placeholder="My Vintage Toy Cars"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              Description <span className="normal-case tracking-normal">(optional)</span>
            </Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder="A few words about this collection…"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              Cover image <span className="normal-case tracking-normal">(optional)</span>
            </Label>
            <div className="max-w-[180px]">
              <ImageUpload
                value={data.cover_image_url}
                onChange={(url) => setData({ ...data, cover_image_url: url })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !data.name.trim() || !data.type.trim()}>
            {saving ? "Saving…" : initial ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}