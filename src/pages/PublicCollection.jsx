import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Library, ImageIcon, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function PublicCollection() {
  const { token } = useParams();
  const [collection, setCollection] = useState(null);
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    const load = async () => {
      try {
        const matches = await base44.entities.Collection.filter({ share_token: token });
        const col = matches?.[0];
        if (!col || !col.is_public) {
          setState("notfound");
          return;
        }
        const its = await base44.entities.Item.filter(
          { collection_id: col.id },
          "-created_date"
        );
        setCollection(col);
        setItems(its);
        setState("ready");
      } catch {
        setState("notfound");
      }
    };
    load();
  }, [token]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (state === "notfound") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <Library className="w-10 h-10 text-muted-foreground/40 mb-4" />
        <h1 className="font-serif text-3xl mb-2">Collection not found</h1>
        <p className="text-sm text-muted-foreground">
          This link may have been removed or made private.
        </p>
      </div>
    );
  }

  const totalValue = items.reduce((s, i) => s + (Number(i.estimated_value) || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
              <Library className="w-3.5 h-3.5 text-background" />
            </div>
            <span className="font-serif text-lg font-semibold">Curio</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-10 mb-10 border-b border-border/60"
        >
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-3">
            {collection.type} collection
          </div>
          <h1 className="font-serif text-5xl font-medium tracking-tight leading-[1.05]">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-muted-foreground mt-4 max-w-xl leading-relaxed">
              {collection.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-5 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{items.length}</span> items
            </span>
            {totalValue > 0 && (
              <>
                <span>·</span>
                <span>
                  Valued at{" "}
                  <span className="font-medium text-foreground">
                    ${totalValue.toLocaleString()}
                  </span>
                </span>
              </>
            )}
          </div>
        </motion.div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-20">
            This collection is empty.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl overflow-hidden bg-card border border-border/70"
              >
                <div className="aspect-square bg-secondary relative overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  {item.estimated_value && (
                    <div className="absolute bottom-2 left-2 text-[11px] font-medium bg-foreground text-background px-2 py-0.5 rounded-full">
                      ${Number(item.estimated_value).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.tags.slice(0, 3).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground border-border/70"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-20 pt-8 border-t border-border/60 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-accent" />
            Curated with Curio
          </p>
        </div>
      </div>
    </div>
  );
}