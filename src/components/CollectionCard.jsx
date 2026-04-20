import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Library } from "lucide-react";

export default function CollectionCard({ collection, itemCount = 0, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <Link
        to={`/collections/${collection.id}`}
        className="group block rounded-2xl overflow-hidden bg-card border border-border/70 hover:border-foreground/30 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)] transition-all duration-500"
      >
        <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
          {collection.cover_image_url ? (
            <img
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Library className="w-10 h-10 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute top-3 right-3 text-[10px] uppercase tracking-widest bg-background/90 backdrop-blur px-2.5 py-1 rounded-full text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs uppercase tracking-[0.15em] text-accent font-medium mb-1.5">
            {collection.type}
          </div>
          <h3 className="font-serif text-xl font-medium leading-tight">
            {collection.name}
          </h3>
          {collection.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {collection.description}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}