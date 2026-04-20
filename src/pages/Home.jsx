import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Library, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CollectionCard from "@/components/CollectionCard";
import CollectionFormDialog from "@/components/CollectionFormDialog";
import SearchBar from "@/components/SearchBar";
import EmptyState from "@/components/EmptyState";
import ItemCard from "@/components/ItemCard";
import { motion } from "framer-motion";

export default function Home() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => base44.entities.Collection.list("-created_date"),
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => base44.entities.Item.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Collection.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });

  const itemCountByCollection = useMemo(() => {
    const map = {};
    items.forEach((i) => {
      map[i.collection_id] = (map[i.collection_id] || 0) + 1;
    });
    return map;
  }, [items]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return items.filter((i) => {
      const inTitle = i.title?.toLowerCase().includes(q);
      const inNotes = i.notes?.toLowerCase().includes(q);
      const inTags = i.tags?.some((t) => t.toLowerCase().includes(q));
      return inTitle || inNotes || inTags;
    });
  }, [items, search]);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-16">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-3">
          Your private gallery
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl font-medium tracking-tight leading-[1.05]">
          Collections,
          <br />
          <span className="italic text-muted-foreground">beautifully kept.</span>
        </h1>
        <p className="text-muted-foreground mt-5 max-w-md leading-relaxed">
          Catalogue your treasures, get AI-powered appraisals, and share your collection with the world — in one elegant place.
        </p>
      </motion.div>

      {/* Search */}
      <div className="max-w-2xl mb-10">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Search results */}
      {search.trim() && (
        <div className="mb-12">
          <h2 className="font-serif text-xl mb-4">
            {searchResults.length} {searchResults.length === 1 ? "result" : "results"} for "{search}"
          </h2>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing found. Try a different tag or word.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {searchResults.map((item, i) => (
                <ItemCard key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collections */}
      {!search.trim() && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-medium">Your collections</h2>
            <div className="flex gap-2">
              <Link to="/appraise">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> Appraise
                </Button>
              </Link>
              <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" /> New
              </Button>
            </div>
          </div>

          {collections.length === 0 ? (
            <EmptyState
              icon={Library}
              title="Start your first collection"
              description="Tell us what you collect — toy cars, vinyl, pottery, anything. We'll help you catalog and appraise it."
              action={
                <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Create collection
                </Button>
              }
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {collections.map((c, i) => (
                <CollectionCard
                  key={c.id}
                  collection={c}
                  itemCount={itemCountByCollection[c.id] || 0}
                  index={i}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CollectionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(d) => createMutation.mutateAsync(d)}
      />
    </div>
  );
}