import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Pencil, Trash2, Sparkles, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ItemFormDialog from "@/components/ItemFormDialog";
import { motion } from "framer-motion";

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: item } = useQuery({
    queryKey: ["item", id],
    queryFn: () => base44.entities.Item.filter({ id }).then((r) => r[0]),
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => base44.entities.Collection.list(),
  });

  const collection = collections.find((c) => c.id === item?.collection_id);

  const updateItem = useMutation({
    mutationFn: (d) => base44.entities.Item.update(id, d),
    onSuccess: () => qc.invalidateQueries(),
  });

  const deleteItem = useMutation({
    mutationFn: () => base44.entities.Item.delete(id),
    onSuccess: () => {
      qc.invalidateQueries();
      navigate(item?.collection_id ? `/collections/${item.collection_id}` : "/");
    },
  });

  if (!item) {
    return <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-8 pb-16">
      <Link
        to={collection ? `/collections/${collection.id}` : "/"}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {collection ? collection.name : "Back"}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid md:grid-cols-2 gap-10"
      >
        <div className="rounded-2xl overflow-hidden bg-secondary aspect-square">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div>
          {collection && (
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-2">
              {collection.type}
            </div>
          )}
          <h1 className="font-serif text-4xl font-medium tracking-tight leading-[1.1]">
            {item.title}
          </h1>

          {(item.estimated_value || item.value_low) && (
            <div className="mt-5 p-4 rounded-xl bg-secondary/60 border border-border/60">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Estimated value
              </div>
              <div className="font-serif text-3xl font-medium">
                {item.estimated_value
                  ? `$${Number(item.estimated_value).toLocaleString()}`
                  : `$${item.value_low?.toLocaleString()} – $${item.value_high?.toLocaleString()}`}
              </div>
              {item.value_low && item.value_high && item.estimated_value && (
                <div className="text-xs text-muted-foreground mt-1">
                  Range: ${item.value_low.toLocaleString()} – ${item.value_high.toLocaleString()}
                </div>
              )}
            </div>
          )}

          {item.tags?.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-full font-normal">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {item.notes && (
            <div className="mt-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {item.ai_appraisal_notes && (
            <div className="mt-5 p-4 rounded-xl bg-secondary/60 border border-border/60">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-accent" /> AI reasoning
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.ai_appraisal_notes}
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-8">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Delete this item?")) deleteItem.mutate();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </motion.div>

      <ItemFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={item}
        collectionType={collection?.type}
        onSubmit={(d) => updateItem.mutateAsync(d)}
      />
    </div>
  );
}