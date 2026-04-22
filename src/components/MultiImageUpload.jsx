import React, { useState } from "react";
import { Upload, Loader2, ImageIcon, X, Plus, RotateCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

async function rotateImageUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    };
    img.src = url;
  });
}

// Displays one thumbnail with rotate + remove buttons
function Thumb({ url, onRotate, onRemove, rotating }) {
  return (
    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0 group">
      <img src={url} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
      <button
        type="button"
        onClick={onRotate}
        disabled={rotating}
        className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-background transition disabled:opacity-50"
        title="Rotate 90°"
      >
        {rotating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-background transition"
        title="Remove"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function MultiImageUpload({ urls = [], onChange, maxImages = 5 }) {
  const [uploading, setUploading] = useState(false);
  const [rotatingIndex, setRotatingIndex] = useState(null);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).slice(0, maxImages - urls.length).map((file) =>
          base44.integrations.Core.UploadFile({ file }).then((r) => r.file_url)
        )
      );
      onChange([...urls, ...uploads]);
    } finally {
      setUploading(false);
    }
  };

  const handleRotate = async (index) => {
    setRotatingIndex(index);
    try {
      const blob = await rotateImageUrl(urls[index]);
      const file = new File([blob], "rotated.jpg", { type: "image/jpeg" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const next = [...urls];
      next[index] = file_url;
      onChange(next);
    } finally {
      setRotatingIndex(null);
    }
  };

  const handleRemove = (index) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  const canAddMore = urls.length < maxImages;

  return (
    <div className="space-y-2">
      {/* Preview grid */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <Thumb
              key={url + i}
              url={url}
              onRotate={() => handleRotate(i)}
              onRemove={() => handleRemove(i)}
              rotating={rotatingIndex === i}
            />
          ))}
        </div>
      )}

      {/* Upload area — shown as big drop zone when empty, small button when has images */}
      {canAddMore && (
        urls.length === 0 ? (
          <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-border bg-secondary/40 cursor-pointer hover:border-foreground/40 hover:bg-secondary transition">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImageIcon className="w-7 h-7 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Upload photo(s)
                </span>
                <span className="text-[10px] text-muted-foreground mt-1 opacity-70">
                  You can select multiple
                </span>
              </>
            )}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
        ) : (
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-dashed border-border rounded-lg px-3 py-2 cursor-pointer hover:border-foreground/40 hover:text-foreground hover:bg-secondary transition">
            {uploading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            Add photo {urls.length > 0 && `(${urls.length}/${maxImages})`}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
        )
      )}
    </div>
  );
}