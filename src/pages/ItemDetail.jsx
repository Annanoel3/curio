import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Pencil, Trash2, Sparkles, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import ItemFormDialog from "@/components/ItemFormDialog";
import { toast } from "sonner";

const fmt = (n) =>
  n != null && !isNaN(n)
    ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : null;

export default function ItemDetail() {
  const { collectionId, itemId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ["item", itemId],
    queryFn: async () => {
      const res = await base44.entities.Item.filter({ id: itemId });
      return res[0] || null;
    },
  });

  const { data: collection } = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: async () => {
      const res = await base44.entities.Collection.filter({ id: collectionId });
      return res[0] || null;
    },
  });

  const updateItem = useMutation({
    mutationFn: (data) => base44.entities.Item.update(itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item", itemId] });
      qc.invalidateQueries({ queryKey: ["items", collectionId] });
      toast.success("Item updated");
    },
  });

  const deleteItem = useMutation({
    mutationFn: () => base44.entities.Item.delete(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items", collectionId] });
      navigate(`/collections/${collectionId}`);
      toast.success("Item deleted");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12">
        <div className="animate-pulse grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-secondary rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-secondary rounded-xl w-2/3" />
            <div className="h-4 bg-secondary rounded-xl w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) return <div className="p-12 text-center text-muted-foreground">Item not found</div>;

  const valueDisplay = fmt(item.estimated_value);
  const rangeDisplay =
    item.value_low && item.value_high
      ? `${fmt(item.value_low)} – ${fmt(item.value_high)}`
      : null;

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
      <Link
        to={`/collections/${collectionId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ChevronLeft className="w-4 h-4" />
        {collection?.name || "Collection"}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid md:grid-cols-2 gap-10"
      >
        {/* Image */}
        <div className="rounded-2xl overflow-hidden bg-secondary aspect-square">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium leading-tight mb-3">
              {item.title}
            </h1>
            {item.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((t) => (
                  <Badge key={t} variant="outline" className="font-normal rounded-full">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {(valueDisplay || rangeDisplay) && (
            <div className="p-4 rounded-xl bg-secondary/70">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Estimated value
              </p>
              {valueDisplay && (
                <p className="font-serif text-3xl font-semibold">{valueDisplay}</p>
              )}
              {rangeDisplay && (
                <p className="text-sm text-muted-foreground mt-1">
                  Range: {rangeDisplay}
                </p>
              )}
            </div>
          )}

          {item.notes && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Notes
              </p>
              <p className="text-sm leading-relaxed">{item.notes}</p>
            </div>
          )}

          {item.ai_appraisal_notes && (
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/60">
              <p className="text-xs font-medium flex items-center gap-1 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" /> AI Appraisal
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.ai_appraisal_notes}
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-auto pt-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => deleteItem.mutate()}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </motion.div>

      <ItemFormDialog
        open={editing}
        onOpenChange={setEditing}
        onSubmit={(data) => updateItem.mutateAsync(data)}
        initial={item}
        collectionType={collection?.type}
      />
    </div>
  );
}