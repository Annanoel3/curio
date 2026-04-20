import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Library, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const fmt = (n) =>
  n != null && !isNaN(n)
    ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : null;

function PublicItemCard({ item, index }) {
  const val = fmt(item.estimated_value) ||
    (item.value_low && item.value_high
      ? `${fmt(item.value_low)}–${fmt(item.value_high)}`
      : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl overflow-hidden bg-card border border-border/60"
    >
      <div className="aspect-square bg-secondary relative overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        {val && (
          <div className="absolute bottom-2 left-2 text-[11px] font-medium bg-foreground text-background px-2 py-0.5 rounded-full">
            {val}
          </div>
        )}
      </div>
      <div className="p-3.5">
        <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function PublicCollection() {
  const { token } = useParams();
  const [collection, setCollection] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const cols = await base44.entities.Collection.filter({ share_token: token, is_public: true });
        if (!cols.length) { setError(true); setLoading(false); return; }
        const col = cols[0];
        setCollection(col);
        const its = await base44.entities.Item.filter({ collection_id: col.id }, "-created_date");
        setItems(its);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-6">
        <div>
          <Library className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl mb-2">Collection not found</h2>
          <p className="text-muted-foreground text-sm">This link may have expired or the collection is no longer public.</p>
        </div>
      </div>
    );
  }

  const totalValue = items.reduce((sum, i) => sum + (i.estimated_value || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Cover */}
      {collection.cover_image_url && (
        <div className="h-56 sm:h-72 overflow-hidden">
          <img src={collection.cover_image_url} alt={collection.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-1.5">
            {collection.type} collection
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium mb-2">{collection.name}</h1>
          {collection.description && (
            <p className="text-muted-foreground max-w-xl mb-3">{collection.description}</p>
          )}
          <div className="flex gap-4 text-sm text-muted-foreground mb-10">
            <span>{items.length} {items.length === 1 ? "item" : "items"}</span>
            {totalValue > 0 && <span>~{fmt(totalValue)} total value</span>}
          </div>
        </motion.div>

        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">This collection has no items yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item, i) => (
              <PublicItemCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-xs text-muted-foreground">
            Made with{" "}
            <span className="font-serif italic">Curio</span>
            {" "}— AI-powered collection management
          </p>
        </div>
      </div>
    </div>
  );
}