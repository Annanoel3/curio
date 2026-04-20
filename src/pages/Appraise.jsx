import React, { useState } from "react";
import { Sparkles, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import ImageUpload from "@/components/ImageUpload";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Appraise() {
  const [image, setImage] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!image && !query.trim()) {
      toast.error("Add a photo or describe your item");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("appraiseItem", {
        image_url: image || undefined,
        text_query: image ? undefined : query,
      });
      setResult(res.data?.appraisal);
    } catch {
      toast.error("Appraisal failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 pb-16">
      <div className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-3">
        Instant AI appraisal
      </div>
      <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight leading-[1.05] mb-3">
        How much is it worth?
      </h1>
      <p className="text-muted-foreground mb-10 max-w-lg">
        Snap a photo, or just describe your item. You'll get a ballpark value range in seconds.
      </p>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <ImageUpload value={image} onChange={setImage} />

        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {image ? "Or add context" : "Describe your item"}
          </div>
          <Textarea
            rows={5}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. How much is my 1968 Hot Wheels Redline Custom Camaro in good condition worth?"
          />
          <Button onClick={run} disabled={loading} className="gap-1.5">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Get appraisal
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10 p-8 rounded-2xl bg-card border border-border/70"
          >
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-accent font-medium mb-3">
              <Sparkles className="w-3 h-3" /> AI appraisal
            </div>
            <h2 className="font-serif text-2xl font-medium mb-5">{result.title}</h2>

            <div className="p-5 rounded-xl bg-secondary/60 mb-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Estimated value
              </div>
              <div className="font-serif text-3xl font-medium">
                ${result.value_low?.toLocaleString()} – ${result.value_high?.toLocaleString()}
              </div>
              {result.estimated_value && (
                <div className="text-xs text-muted-foreground mt-1">
                  Midpoint: ${Number(result.estimated_value).toLocaleString()}
                </div>
              )}
            </div>

            {result.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {result.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-full font-normal">
                    {t}
                  </Badge>
                ))}
              </div>
            )}

            {result.notes && (
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                {result.notes}
              </p>
            )}

            {result.appraisal_reasoning && (
              <p className="text-xs leading-relaxed text-muted-foreground italic border-l-2 border-accent/40 pl-3">
                {result.appraisal_reasoning}
              </p>
            )}

            <p className="text-[11px] text-muted-foreground mt-6">
              Ballpark AI estimate. Actual market values vary — consult a professional appraiser for high-value items.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}