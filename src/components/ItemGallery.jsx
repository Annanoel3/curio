import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Loader2, ImageIcon, RotateCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function ItemGallery({ item, onAddImage, onRemoveImage, canEdit = false }) {
  const allImages = [item.image_url, ...(item.extra_images || [])].filter(Boolean);
  const [current, setCurrent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [direction, setDirection] = useState(1);
  const [rotations, setRotations] = useState({});

  const rotate = () => {
    setRotations((prev) => ({
      ...prev,
      [current]: ((prev[current] || 0) + 90) % 360,
    }));
  };

  const go = (dir) => {
    setDirection(dir);
    setCurrent((c) => (c + dir + allImages.length) % allImages.length);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onAddImage(file_url);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const variants = {
    enter: (d) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div className="space-y-3">
      {/* Main viewer */}
      <div className="relative rounded-2xl overflow-hidden bg-secondary aspect-square select-none">
        {allImages.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
          </div>
        ) : (
          <>
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.img
                key={allImages[current]}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", duration: 0.28 }}
                src={allImages[current]}
                alt=""
                className="w-full h-full object-cover absolute inset-0 transition-transform duration-300"
                style={{ transform: `rotate(${rotations[current] || 0}deg)` }}
                draggable={false}
              />
            </AnimatePresence>

            {allImages.length > 1 && (
              <>
                <button
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                      className={`w-1.5 h-1.5 rounded-full transition ${i === current ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Rotate button */}
            {canEdit && allImages.length > 0 && (
              <button
                onClick={rotate}
                className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition"
                title="Rotate image"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Remove current image (only if it's an extra image — not the primary) */}
            {canEdit && current > 0 && (
              <button
                onClick={() => {
                  onRemoveImage(current - 1);
                  setCurrent((c) => Math.max(0, c - 1));
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Thumbnails + add button */}
      {canEdit && (
        <div className="flex gap-2 flex-wrap">
          {allImages.map((url, i) => (
            <button
              key={url}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
              className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition flex-shrink-0 ${
                i === current ? "border-foreground" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
          <label className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-foreground/40 hover:bg-secondary transition flex-shrink-0">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <Plus className="w-4 h-4 text-muted-foreground" />
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}