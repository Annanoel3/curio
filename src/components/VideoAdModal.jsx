import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

// 🎬 Replace this with your actual ad video URL
const AD_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4";

export default function VideoAdModal({ open, onClose }) {
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setCanClose(false);
      setCountdown(5);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden shadow-2xl bg-black">
        {/* Close button / countdown */}
        <div className="absolute top-3 right-3 z-10">
          {canClose ? (
            <button
              onClick={onClose}
              aria-label="Close ad"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-black/70 text-white hover:bg-black/90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-black/70 text-white text-sm font-semibold select-none">
              {countdown}
            </div>
          )}
        </div>

        {/* Ad label */}
        <div className="absolute top-3 left-3 z-10 text-[10px] font-medium text-white/60 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">
          Ad
        </div>

        {/* Video */}
        <video
          ref={videoRef}
          src={AD_VIDEO_URL}
          autoPlay
          playsInline
          className="w-full aspect-video object-cover"
          onEnded={() => setCanClose(true)}
        />
      </div>
    </div>
  );
}
