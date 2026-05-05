import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";

const randomToken = () =>
  Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);

export default function ShareDialog({ open, onOpenChange, collection, onUpdated }) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!collection) return null;

  const baseUrl = appParams.appBaseUrl || window.location.origin;
  const shareUrl = collection.share_token
    ? `${baseUrl}/share/${collection.share_token}`
    : "";

  const toggle = async (next) => {
    setSaving(true);
    try {
      const patch = { is_public: next };
      if (next && !collection.share_token) patch.share_token = randomToken();
      const updated = await base44.entities.Collection.update(collection.id, patch);
      onUpdated?.(updated);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <Share2 className="w-5 h-5" /> Share collection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-secondary/60">
            <div>
              <div className="font-medium text-sm">Public link</div>
              <p className="text-xs text-muted-foreground mt-1">
                Anyone with the link can view this collection — no account needed.
              </p>
            </div>
            <Switch
              checked={!!collection.is_public}
              onCheckedChange={toggle}
              disabled={saving}
            />
          </div>

          {collection.is_public && shareUrl && (
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-xs" />
              <Button onClick={copy} variant="outline" size="icon" className="shrink-0">
                {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}