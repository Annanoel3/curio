import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, Camera, MessageSquare, Upload, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import ImageUpload from "@/components/ImageUpload";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const fmt = (n) =>
  n != null && !isNaN(n)
    ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : null;

export default function Appraise() {
  const [mode, setMode] = useState("photo");
  const [imageUrl, setImageUrl] = useState("");
  const [query, setQuery] = useState("");
  const [collectionType, setCollectionType] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (mode === "photo" && !imageUrl) { toast.error("Upload a photo first"); return; }
    if (mode === "text" && !query.trim()) { toast.error("Enter a description first"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("appraiseItem", {
        image_url: mode === "photo" ? imageUrl : undefined,
        text_query: mode === "text" ? query : undefined,
        collection_type: collectionType || undefined,
      });
      setResult(res.data?.appraisal);
    } catch {
      toast.error("Appraisal failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-2">Powered by AI</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium mb-3">Appraise an item</h1>
        <p className="text-muted-foreground mb-10">
          Upload a photo or describe your item — our AI will estimate its current market value.
        </p>
      </motion.div>

      <div className="space-y-6">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
            What kind of collectible?  <span className="normal-case tracking-normal">(optional, improves accuracy)</span>
          </Label>
          <Input
            value={collectionType}
            onChange={(e) => setCollectionType(e.target.value)}
            placeholder="e.g. vintage toy cars, coins, trading cards…"
          />
        </div>

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="w-full">
            <TabsTrigger value="photo" className="flex-1 gap-1.5">
              <Camera className="w-4 h-4" /> Photo appraisal
            </TabsTrigger>
            <TabsTrigger value="text" className="flex-1 gap-1.5">
              <MessageSquare className="w-4 h-4" /> Describe it
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photo" className="pt-5">
            <div className="max-w-sm mx-auto">
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
            </div>
          </TabsContent>

          <TabsContent value="text" className="pt-5">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              placeholder="e.g. How much is a 1967 Hot Wheels Redline Camaro in good condition worth?"
            />
          </TabsContent>
        </Tabs>

        <Button onClick={run} disabled={loading} className="w-full h-12 gap-2 text-base">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Appraising…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Get appraisal</>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10 rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="p-6 border-b border-border/60 bg-secondary/40">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Appraisal result</p>
              <h2 className="font-serif text-2xl font-medium">{result.title}</h2>
            </div>

            <div className="p-6 space-y-5">
              {(result.estimated_value || result.value_low) && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                    Estimated market value
                  </p>
                  <p className="font-serif text-4xl font-semibold text-foreground">
                    {fmt(result.estimated_value)}
                  </p>
                  {result.value_low && result.value_high && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Range: {fmt(result.value_low)} – {fmt(result.value_high)}
                    </p>
                  )}
                </div>
              )}

              {result.tags?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.tags.map((t) => (
                      <Badge key={t} variant="outline" className="font-normal rounded-full">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.notes && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm leading-relaxed">{result.notes}</p>
                </div>
              )}

              {result.appraisal_reasoning && (
                <div className="p-3.5 rounded-xl bg-secondary/60 border border-border/60">
                  <p className="text-xs font-medium flex items-center gap-1 mb-1.5">
                    <Sparkles className="w-3 h-3 text-accent" /> AI reasoning
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {result.appraisal_reasoning}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}