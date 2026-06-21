/**
 * Lädt eine Bilddatei in die Mediathek hoch und liefert die öffentliche URL zurück.
 *
 * Wird als `onImageUpload` an den WYSIWYG-Editor übergeben (Paste/Drop/Upload-Dialog).
 * Der Editor erwartet `Promise<string>` (die fertige Bild-URL).
 *
 * Endpoint: POST /api/media (multipart, Feld `file`), Auth ADMIN/EDITOR via Cookie,
 * antwortet mit Status 201 und dem vollständigen Media-Objekt inkl. `url`.
 */
export async function uploadImageToMedia(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/media", {
    method: "POST",
    body: fd,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Upload fehlgeschlagen");
  }

  const media = (await res.json()) as { url?: string };
  if (!media?.url) {
    throw new Error("Upload-Antwort enthielt keine URL");
  }
  return media.url;
}
