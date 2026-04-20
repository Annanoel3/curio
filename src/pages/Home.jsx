import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import CollectionCard from "@/components/CollectionCard";
import CollectionFormDialog from "@/components/CollectionFormDialog";
import EmptyState from "@/components/EmptyState";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => base44.entities.Collection.list("-created_date"),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["all-items"],
    queryFn: () => base44.entities.Item.list(),
  });

  const itemCounts = allItems.reduce((acc, item) => {
    acc[item.collection_id] = (acc[item.collection_id] || 0) + 1;
    return acc;
  }, {});

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Collection.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-2">Your collections</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium leading-tight">
            The Curio Cabinet
          </h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          New collection
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-secondary animate-pulse aspect-[4/3]" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Your cabinet awaits"
          description="Create your first collection to start cataloguing what you love."
          action={
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Start a collection
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((c, i) => (
            <CollectionCard
              key={c.id}
              collection={c}
              itemCount={itemCounts[c.id] || 0}
              index={i}
            />
          ))}
        </div>
      )}

      <CollectionFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
    </div>
  );
}