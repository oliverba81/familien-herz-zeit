"use client";

import { useState } from "react";
import MediaPickerModal from "@/components/media/media-picker-modal";

/**
 * Puck-Custom-Feld für eine Medien-URL: öffnet den vorhandenen MediaPicker statt
 * manueller URL-Eingabe. Setzt nur die URL (alt/caption bleiben eigene Felder).
 */
export function MediaUrlField({
  value,
  onChange,
  mediaType = "image",
}: {
  value?: string;
  onChange: (value: string) => void;
  mediaType?: "image" | "video";
}) {
  const [open, setOpen] = useState(false);
  const isVideo = mediaType === "video";

  return (
    <div className="space-y-2">
      {value ? (
        isVideo ? (
          <video src={value} className="max-h-32 rounded border border-gray-200" muted />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="max-h-32 rounded border border-gray-200" />
        )
      ) : (
        <div className="text-xs text-gray-400">
          {isVideo ? "Kein Video gewählt" : "Kein Bild gewählt"}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 text-sm rounded-lg bg-rose-500 text-white hover:bg-rose-600"
        >
          {value ? "Ändern" : isVideo ? "Video wählen" : "Bild wählen"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Entfernen
          </button>
        )}
      </div>
      <MediaPickerModal
        open={open}
        onClose={() => setOpen(false)}
        type={mediaType}
        onSelect={(m) => {
          onChange(m.url);
          setOpen(false);
        }}
      />
    </div>
  );
}
