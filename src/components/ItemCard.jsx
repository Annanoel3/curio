import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formatMoney = (n) => {
  if (n == null || isNaN(n)) return null;
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export default function ItemCard({ item, index = 0, to }) {
  const value = item.estimated_value ?? (item.value_low && item.value_high
    ? `${formatMoney(item.value_low)}–${formatMoney(item.value_high)}`
    : null);
  const displayValue = typeof value === "number" ? formatMoney(value) : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35 }}
    >
      <Link
        to={to || `/items/${item.id}`}
        className="group block rounded-xl overflow-hidden bg-card border border-border/70 hover:border-foreground/30 hover:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.1)] transition-all duration-500"
      >
        <div className="aspect-square bg-secondary relative overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
          {displayValue && (
            <div className="absolute bottom-2 left-2 text-[11px] font-medium bg-foreground text-background px-2 py-0.5 rounded-full">
              {displayValue}
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
      </Link>
    </motion.div>
  );
}