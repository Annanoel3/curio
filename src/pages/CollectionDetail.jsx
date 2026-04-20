import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, Share2, Pencil, Trash2, ImageIcon, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ItemCard from "@/components/ItemCard";
import SearchBar from "@/components/SearchBar";
import ItemFormDialog from "@/components/ItemFormDialog";
import CollectionFormDialog from "@/components/CollectionFormDialog";
import ShareDialog from "@/components/ShareDialog";
import EmptyState from "@/components/EmptyState";

export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [itemOpen, setItemOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => base44.entities.Collection.list(),
  });
  const collection = collections.find((c) => c.id === id);

  const { data: items = [] } = useQuery({
    queryKey: ["items", id],
    queryFn: () => base44.entities.Item.filter({ collection_id: id }, "-created_date"),
    enabled: !!id,
  });

  const createItem = useMutation({
    mutationFn: (d) => base44.entities.Item.create({ ...d, collection_id: id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });

  const updateCollection = useMutation({
    mutationFn: (d) => base44.entities.Collection.update(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });

  const deleteCollection = useMutation({
    mutationFn: async () => {
      await Promise.all(items.map((i) => base44.entities.Item.delete(i.id)));
      await base44.entities.Collection.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      navigate("/");
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.title?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q) ||
        i.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [items, search]);

  const totalValue = useMemo(() => {
    return items.reduce((sum, i) => sum + (Number(i.estimated_value) || 0), 0);
  }, [items]);

  if (!collection) {
    return (
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 text-center">
        <p className="text-muted-foreground">Loading collection…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 pb-16">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All collections
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-border/60">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-2">
            {collection.type}
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight leading-[1.05]">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-muted-foreground mt-3 max-w-xl">{collection.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{items.length}</span>{" "}
              {items.length === 1 ? "item" : "items"}
            </span>
            {totalValue > 0 && (
              <>
                <span>·</span>
                <span>
                  Estimated total{" "}
                  <span className="font-medium text-foreground">
                    ${totalValue.toLocaleString()}
                  </span>
                </span>
              </>
            )}
            {collection.is_public && (
              <>
                <span>·</span>
                <Badge variant="outline" className="text-[10px] font-normal">
                  Public
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Share
          </Button>
          <Button size="sm" onClick={() => setItemOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add item
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit collection
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (confirm("Delete this collection and all its items?")) {
                    deleteCollection.mutate();
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md mb-8">
        <SearchBar value={search} onChange={setSearch} placeholder="Search this collection…" />
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No items yet"
          description="Add your first piece — snap a photo and let AI identify and appraise it."
          action={
            <Button onClick={() => setItemOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add item
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items match "{search}".</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((item, i) => (
            <ItemCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}

      <ItemFormDialog
        open={itemOpen}
        onOpenChange={setItemOpen}
        onSubmit={(d) => createItem.mutateAsync(d)}
        collectionType={collection.type}
      />
      <CollectionFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={collection}
        onSubmit={(d) => updateCollection.mutateAsync(d)}
      />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        collection={collection}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["collections"] })}
      />
    </div>
  );
}