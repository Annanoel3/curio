import React from "react";
import { motion } from "framer-motion";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-20 px-6"
    >
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-5">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="font-serif text-2xl font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground max-w-sm mb-6 text-sm leading-relaxed">
          {description}
        </p>
      )}
      {action}
    </motion.div>
  );
}