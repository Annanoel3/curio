import React, { useState } from "react";
import { Upload, Loader2, ImageIcon, X, RotateCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

async function rotateImageUrl(url, degrees) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const swap = degrees === 90 || degrees === 270;
      const canvas = document.createElement("canvas");
      canvas.width = swap ? img.height : img.width;
      canvas.height = swap ? img.width : img.height;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    };
    img.src = url;
  });
}

export default function ImageUpload({ value, onChange, className = "" }) {
  const [uploading, setUploading] = useState(false);
  const [rotating, setRotating] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } finally {
      setUploading(false);
    }
  };

  const handleRotate = async () => {
    if (!value || rotating) return;
    setRotating(true);
    try {
      const blob = await rotateImageUrl(value, 90);
      const file = new File([blob], "rotated.jpg", { type: "image/jpeg" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {value ? (
        <div className="relative rounded-xl overflow-hidden aspect-square bg-secondary group">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleRotate}
            disabled={rotating}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-background transition disabled:opacity-50"
            title="Rotate 90°"
          >
            {rotating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCw className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-background transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-border bg-secondary/40 cursor-pointer hover:border-foreground/40 hover:bg-secondary transition">
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="w-7 h-7 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Upload className="w-3 h-3" /> Upload photo
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}