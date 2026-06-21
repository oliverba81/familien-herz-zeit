"use client";

/** Ladezustand für ein Live-Embed im Editor. */
export function EmbedSkeleton({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "24px",
        borderRadius: "12px",
        background: "#f9fafb",
        border: "1px solid rgba(0,0,0,.08)",
        color: "#6b7280",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: "14px",
        textAlign: "center",
      }}
    >
      {label} wird geladen …
    </div>
  );
}

/** Fehlerzustand für ein Live-Embed im Editor. */
export function EmbedError({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "12px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#991b1b",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: "13px",
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}
