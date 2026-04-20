import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ImageUpload from "@/components/ImageUpload";
import TagInput from "@/components/TagInput";
import { toast } from "sonner";

const empty = {
  title: "",
  notes: "",
  tags: [],
  image_url: "",
  estimated_value: "",
  value_low: null,
  value_high: null,
  ai_appraisal_notes: "",
};

export default function ItemFormDialog({ open, onOpenChange, onSubmit, initial, collectionType }) {
  const [data, setData] = useState(empty);
  const [appraising, setAppraising] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setData(initial || empty);
  }, [open, initial]);

  const runAppraisal = async () => {
    if (!data.image_url && !data.title.trim()) {
      toast.error("Add a photo or title first");
      return;
    }
    setAppraising(true);
    try {
      const res = await base44.functions.invoke("appraiseItem", {
        image_url: data.image_url || undefined,
        text_query: data.image_url ? undefined : data.title,
        collection_type: collectionType,
      });
      const a = res.data?.appraisal;
      if (!a) throw new Error("No appraisal returned");
      setData((prev) => ({
        ...prev,
        title: prev.title || a.title || "",
        notes: prev.notes || a.notes || "",
        tags: prev.tags?.length ? prev.tags : (a.tags || []),
        estimated_value: a.estimated_value ?? prev.estimated_value,
        value_low: a.value_low ?? null,
        value_high: a.value_high ?? null,
        ai_appraisal_notes: a.appraisal_reasoning || "",
      }));
      toast.success("AI appraisal complete");
    } catch (e) {
      toast.error("Appraisal failed");
    } finally {
      setAppraising(false);
    }
  };

  const handleSubmit = async () => {
    if (!data.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...data,
        estimated_value: data.estimated_value === "" ? null : Number(data.estimated_value),
      };
      await onSubmit(payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {initial ? "Edit item" : "Add item"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[200px_1fr] gap-6 py-2">
          <div>
            <ImageUpload
              value={data.image_url}
              onChange={(url) => setData({ ...data, image_url: url })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runAppraisal}
              disabled={appraising}
              className="w-full mt-3 gap-1.5"
            >
              {appraising ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-accent" />
              )}
              AI Appraise
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Title
              </Label>
              <Input
                value={data.title}
                onChange={(e) => setData({ ...data, title: e.target.value })}
                placeholder="1967 Hot Wheels Redline Camaro"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Tags
              </Label>
              <TagInput
                tags={data.tags || []}
                onChange={(tags) => setData({ ...data, tags })}
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Notes
              </Label>
              <Textarea
                value={data.notes}
                onChange={(e) => setData({ ...data, notes: e.target.value })}
                rows={4}
                placeholder="Condition, story, provenance…"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Estimated value (USD) <span className="normal-case tracking-normal">— optional</span>
              </Label>
              <Input
                type="number"
                value={data.estimated_value ?? ""}
                onChange={(e) => setData({ ...data, estimated_value: e.target.value })}
                placeholder="AI will fill this if left blank"
              />
              {(data.value_low || data.value_high) && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  AI range: ${data.value_low?.toLocaleString()} – ${data.value_high?.toLocaleString()}
                </p>
              )}
            </div>

            {data.ai_appraisal_notes && (
              <div className="p-3 rounded-lg bg-secondary/60 text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-accent" /> AI reasoning
                </span>
                {data.ai_appraisal_notes}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !data.title.trim()}>
            {saving ? "Saving…" : initial ? "Save" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}