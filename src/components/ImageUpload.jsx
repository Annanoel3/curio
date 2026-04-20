import React, { useState } from "react";
import { Upload, Loader2, ImageIcon, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ImageUpload({ value, onChange, className = "" }) {
  const [uploading, setUploading] = useState(false);

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

  return (
    <div className={`relative ${className}`}>
      {value ? (
        <div className="relative rounded-xl overflow-hidden aspect-square bg-secondary group">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-background transition"
          >
            <X className="w-4 h-4" />
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