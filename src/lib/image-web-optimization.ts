/**
 * Client-seitige Bildprüfung und WebP-Vorschau.
 * Nur Browser-APIs (createImageBitmap, Canvas, Blob, URL) – kein Node/sharp.
 */

export const MAX_EDGE_PX = 1920;
export const MAX_FILE_SIZE_BYTES = 500 * 1024;
export const WEBP_QUALITY = 0.85;

export async function isImageTooLargeForWeb(file: File): Promise<boolean> {
  if (file.size > MAX_FILE_SIZE_BYTES) return true;
  try {
    const bitmap = await createImageBitmap(file);
    const w = bitmap.width;
    const h = bitmap.height;
    bitmap.close();
    return Math.max(w, h) > MAX_EDGE_PX;
  } catch {
    return false;
  }
}

export interface OptimizationPreview {
  previewUrl: string;
  width: number;
  height: number;
  estimatedSize: number;
  optimizedBlob: Blob;
  mimeType: "image/webp";
}

export async function getOptimizationPreview(
  file: File
): Promise<OptimizationPreview> {
  const bitmap = await createImageBitmap(file);
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  let w = srcW;
  let h = srcH;
  if (Math.max(w, h) > MAX_EDGE_PX) {
    if (w >= h) {
      h = Math.round((h * MAX_EDGE_PX) / w);
      w = MAX_EDGE_PX;
    } else {
      w = Math.round((w * MAX_EDGE_PX) / h);
      h = MAX_EDGE_PX;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 2D nicht verfügbar");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
  });
  if (!blob || blob.size === 0) {
    throw new Error("WebP-Optimierung nicht verfügbar (Browser unterstützt WebP im Canvas möglicherweise nicht)");
  }
  const previewUrl = URL.createObjectURL(blob);
  return {
    previewUrl,
    width: w,
    height: h,
    estimatedSize: blob.size,
    optimizedBlob: blob,
    mimeType: "image/webp",
  };
}
