import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, ChevronLeft, Share2, Pencil, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import ItemCard from "@/components/ItemCard";
import ItemFormDialog from "@/components/ItemFormDialog";
import CollectionFormDialog from "@/components/CollectionFormDialog";
import ShareDialog from "@/components/ShareDialog";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";

export default function CollectionDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditCollection, setShowEditCollection] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [collectionData, setCollectionData] = useState(null);

  const { data: collection, isLoading: loadingCol } = useQuery({
    queryKey: ["collection", id],
    queryFn: async () => {
      const res = await base44.entities.Collection.filter({ id });
      return res[0] || null;
    },
    onSuccess: (d) => setCollectionData(d),
  });

  const activeCollection = collectionData || collection;

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["items", id],
    queryFn: () => base44.entities.Item.filter({ collection_id: id }, "-created_date"),
  });

  const createItem = useMutation({
    mutationFn: (data) => base44.entities.Item.create({ ...data, collection_id: id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items", id] }),
  });

  const updateCollection = useMutation({
    mutationFn: (data) => base44.entities.Collection.update(id, data),
    onSuccess: (updated) => {
      setCollectionData(updated);
      qc.invalidateQueries({ queryKey: ["collection", id] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (itemId) => base44.entities.Item.delete(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items", id] });
      toast.success("Item removed");
    },
  });

  const allTags = useMemo(() => {
    const set = new Set();
    items.forEach((item) => item.tags?.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q));
      const matchesTag = !activeTag || item.tags?.includes(activeTag);
      return matchesSearch && matchesTag;
    });
  }, [items, search, activeTag]);

  if (loadingCol) {
    return (
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="animate-pulse h-10 w-48 bg-secondary rounded-xl mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-secondary aspect-square animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!activeCollection) return <div className="p-12 text-center text-muted-foreground">Collection not found</div>;

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="w-4 h-4" /> All collections
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-1.5">
              {activeCollection.type} collection
            </p>
            <h1 className="font-serif text-4xl font-medium">{activeCollection.name}</h1>
            {activeCollection.description && (
              <p className="text-muted-foreground mt-2 max-w-xl">{activeCollection.description}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowShare(true)} className="gap-1.5">
              <Share2 className="w-3.5 h-3.5" /> Share
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEditCollection(true)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button size="sm" onClick={() => setShowAddItem(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add item
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              !activeTag
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40"
            }`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                activeTag === t
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/40"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Items grid */}
      {loadingItems ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-secondary aspect-square animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={search || activeTag ? "No items match" : "Nothing here yet"}
          description={
            search || activeTag
              ? "Try a different search or tag filter."
              : "Add your first item to this collection."
          }
          action={
            !search && !activeTag ? (
              <Button onClick={() => setShowAddItem(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add item
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item, i) => (
            <div key={item.id} className="relative group">
              <ItemCard item={item} index={i} to={`/collections/${id}/items/${item.id}`} />
              <button
                onClick={() => deleteItem.mutate(item.id)}
                className="absolute top-2 left-2 w-7 h-7 rounded-full bg-background/90 backdrop-blur items-center justify-center hidden group-hover:flex text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ItemFormDialog
        open={showAddItem}
        onOpenChange={setShowAddItem}
        onSubmit={(data) => createItem.mutateAsync(data)}
        collectionType={activeCollection.type}
      />
      <CollectionFormDialog
        open={showEditCollection}
        onOpenChange={setShowEditCollection}
        onSubmit={(data) => updateCollection.mutateAsync(data)}
        initial={activeCollection}
      />
      <ShareDialog
        open={showShare}
        onOpenChange={setShowShare}
        collection={activeCollection}
        onUpdated={(updated) => setCollectionData(updated)}
      />
    </div>
  );
}