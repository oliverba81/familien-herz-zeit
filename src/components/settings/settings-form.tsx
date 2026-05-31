"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MediaPicker from "@/components/media/media-picker";
import HtmlEditor from "@/components/admin/html-editor";

interface SettingsFormProps {
  initialSettings: Record<string, string | null>;
}

interface TopBarItem {
  type: "phone" | "email" | "text" | "link";
  label: string;
  value: string;
  href?: string;
}

interface TopBarConfig {
  enabled: boolean;
  backgroundColor: string;
  textColor: string;
  height: number;
  items: TopBarItem[];
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [siteName, setSiteName] = useState(initialSettings.site_name || "Familien Herz Zeit");
  const [logoUrl, setLogoUrl] = useState(initialSettings.header_logo_url || "");
  const [faviconUrl, setFaviconUrl] = useState(initialSettings.favicon_url || "");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showFaviconPicker, setShowFaviconPicker] = useState(false);
  const [mediaPickerType, setMediaPickerType] = useState<"logo" | "favicon">("logo");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [headerHtml, setHeaderHtml] = useState(initialSettings.header_html || "");
  const [footerHtml, setFooterHtml] = useState(initialSettings.footer_html || "");

  // Top-Bar Konfiguration
  const [topBarConfig, setTopBarConfig] = useState<TopBarConfig>(() => {
    try {
      const configJson = initialSettings.top_bar_config;
      if (configJson) {
        const parsed = JSON.parse(configJson);
        // Backward Compatibility: Wenn height nicht gesetzt, Standard-Wert verwenden
        if (!parsed.height) {
          parsed.height = 40;
        }
        return parsed;
      }
    } catch (error) {
      console.error("Fehler beim Parsen der Top-Bar Config:", error);
    }
    // Standard-Werte
    return {
      enabled: true,
      backgroundColor: "#2563eb",
      textColor: "#ffffff",
      height: 40,
      items: [
        {
          type: "phone",
          label: "0174 / 837 24 63",
          value: "01748372463",
        },
        {
          type: "email",
          label: "info@familien-herz-zeit.de",
          value: "info@familien-herz-zeit.de",
        },
      ],
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            site_name: siteName,
            header_logo_url: logoUrl || null,
            favicon_url: faviconUrl || null,
            top_bar_config: JSON.stringify(topBarConfig),
            header_html: headerHtml || null,
            footer_html: footerHtml || null,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Speichern");
      }

      setMessage({ type: "success", text: "Einstellungen erfolgreich gespeichert!" });
      router.refresh();
      
      // Reload nach kurzer Zeit, damit Logo aktualisiert wird
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Fehler:", error);
      setMessage({ type: "error", text: "Fehler beim Speichern der Einstellungen" });
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSelect = (url: string) => {
    if (mediaPickerType === "logo") {
      setLogoUrl(url);
    } else {
      setFaviconUrl(url);
    }
    setShowMediaPicker(false);
    setShowFaviconPicker(false);
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
  };

  const handleRemoveFavicon = () => {
    setFaviconUrl("");
  };

  const openMediaPicker = (type: "logo" | "favicon") => {
    setMediaPickerType(type);
    if (type === "logo") {
      setShowMediaPicker(true);
    } else {
      setShowFaviconPicker(true);
    }
  };

  // Top-Bar Funktionen
  const addTopBarItem = () => {
    setTopBarConfig({
      ...topBarConfig,
      items: [
        ...topBarConfig.items,
        {
          type: "text",
          label: "Neuer Eintrag",
          value: "",
        },
      ],
    });
  };

  const removeTopBarItem = (index: number) => {
    setTopBarConfig({
      ...topBarConfig,
      items: topBarConfig.items.filter((_, i) => i !== index),
    });
  };

  const updateTopBarItem = (index: number, field: keyof TopBarItem, value: string) => {
    const newItems = [...topBarConfig.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setTopBarConfig({ ...topBarConfig, items: newItems });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seitenname *
        </label>
        <input
          type="text"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          placeholder="Familien Herz Zeit"
          required
        />
        <p className="mt-1 text-sm text-gray-500">
          Wird angezeigt, wenn kein Logo gesetzt ist. Kann immer geändert werden.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Header Logo
        </label>
        {logoUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <img
                src={logoUrl}
                alt="Logo Vorschau"
                className="h-16 w-auto object-contain"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Logo wird angezeigt</p>
                <p className="text-xs text-gray-500 mt-1">{logoUrl}</p>
              </div>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              >
                Entfernen
              </button>
            </div>
            <button
              type="button"
              onClick={() => openMediaPicker("logo")}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
            >
              Logo ändern
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openMediaPicker("logo")}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
          >
            Logo auswählen
          </button>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Wenn ein Logo gesetzt ist, wird es statt dem Seitennamen angezeigt
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Favicon
        </label>
        {faviconUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <img
                src={faviconUrl}
                alt="Favicon Vorschau"
                className="h-8 w-8 object-contain"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Favicon wird angezeigt</p>
                <p className="text-xs text-gray-500 mt-1">{faviconUrl}</p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFavicon}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              >
                Entfernen
              </button>
            </div>
            <button
              type="button"
              onClick={() => openMediaPicker("favicon")}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
            >
              Favicon ändern
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openMediaPicker("favicon")}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
          >
            Favicon auswählen
          </button>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Das Favicon wird im Browser-Tab angezeigt. Empfohlene Größe: 32x32px oder 16x16px
        </p>
      </div>

      {/* Top-Bar Konfiguration */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Obere Kontaktleiste</h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="topBarEnabled"
              checked={topBarConfig.enabled}
              onChange={(e) =>
                setTopBarConfig({ ...topBarConfig, enabled: e.target.checked })
              }
              className="w-4 h-4 text-rose-500 border-gray-300 rounded focus:ring-rose-500"
            />
            <label htmlFor="topBarEnabled" className="text-sm font-medium text-gray-700">
              Obere Kontaktleiste aktivieren
            </label>
          </div>

          {topBarConfig.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hintergrundfarbe
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={topBarConfig.backgroundColor}
                      onChange={(e) =>
                        setTopBarConfig({
                          ...topBarConfig,
                          backgroundColor: e.target.value,
                        })
                      }
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={topBarConfig.backgroundColor}
                      onChange={(e) =>
                        setTopBarConfig({
                          ...topBarConfig,
                          backgroundColor: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono text-sm"
                      placeholder="#2563eb"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Textfarbe
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={topBarConfig.textColor}
                      onChange={(e) =>
                        setTopBarConfig({
                          ...topBarConfig,
                          textColor: e.target.value,
                        })
                      }
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={topBarConfig.textColor}
                      onChange={(e) =>
                        setTopBarConfig({
                          ...topBarConfig,
                          textColor: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono text-sm"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Höhe (in Pixel)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="20"
                      max="100"
                      value={topBarConfig.height}
                      onChange={(e) =>
                        setTopBarConfig({
                          ...topBarConfig,
                          height: parseInt(e.target.value) || 40,
                        })
                      }
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                      placeholder="40"
                    />
                    <span className="text-sm text-gray-500">px</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Empfohlene Höhe: 30-50px
                  </p>
                </div>
              </div>

              {/* Vorschau */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vorschau
                </label>
                <div
                  className="text-sm rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: topBarConfig.backgroundColor,
                    color: topBarConfig.textColor,
                    height: `${topBarConfig.height}px`,
                  }}
                >
                  <div className="flex justify-end items-center h-full gap-6 flex-wrap px-4">
                    {topBarConfig.items.length > 0 ? (
                      topBarConfig.items.map((item, index) => (
                        <span key={index} className="flex items-center gap-1">
                          {item.type === "phone" && <span>☎</span>}
                          {item.type === "email" && <span>✉</span>}
                          <span>{item.label || "Eintrag"}</span>
                        </span>
                      ))
                    ) : (
                      <span className="opacity-50">Keine Einträge</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Einträge
                  </label>
                  <button
                    type="button"
                    onClick={addTopBarItem}
                    className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                  >
                    + Eintrag hinzufügen
                  </button>
                </div>

                <div className="space-y-3">
                  {topBarConfig.items.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Typ
                          </label>
                          <select
                            value={item.type}
                            onChange={(e) =>
                              updateTopBarItem(
                                index,
                                "type",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                          >
                            <option value="phone">Telefon</option>
                            <option value="email">E-Mail</option>
                            <option value="text">Text</option>
                            <option value="link">Link</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {item.type === "link" ? "URL" : "Wert"}
                          </label>
                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) =>
                              updateTopBarItem(index, "value", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                            placeholder={
                              item.type === "phone"
                                ? "01748372463"
                                : item.type === "email"
                                ? "info@example.de"
                                : item.type === "link"
                                ? "https://..."
                                : ""
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Anzeigetext
                        </label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) =>
                            updateTopBarItem(index, "label", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                          placeholder="0174 / 837 24 63"
                        />
                      </div>

                      {item.type === "link" && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Link-URL
                          </label>
                          <input
                            type="text"
                            value={item.href || ""}
                            onChange={(e) =>
                              updateTopBarItem(index, "href", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                            placeholder="/kontakt oder https://..."
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeTopBarItem(index)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Header HTML Editor */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Header HTML</h2>
        <HtmlEditor
          label="Header HTML-Code"
          value={headerHtml}
          onChange={setHeaderHtml}
          placeholder='<nav className="bg-white shadow-md">...</nav>'
          helpText="Wenn HTML gesetzt ist, wird es anstelle der Standard-Header-Komponente gerendert. Leer lassen, um die Standard-Komponente zu verwenden."
        />
      </div>

      {/* Footer HTML Editor */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Footer HTML</h2>
        <HtmlEditor
          label="Footer HTML-Code"
          value={footerHtml}
          onChange={setFooterHtml}
          placeholder='<footer className="bg-gray-900">...</footer>'
          helpText="Wenn HTML gesetzt ist, wird es anstelle der Standard-Footer-Komponente gerendert. Leer lassen, um die Standard-Komponente zu verwenden."
        />
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Wird gespeichert..." : "Speichern"}
        </button>
      </div>

      {(showMediaPicker || showFaviconPicker) && (
        <MediaPicker
          open={showMediaPicker || showFaviconPicker}
          onClose={() => {
            setShowMediaPicker(false);
            setShowFaviconPicker(false);
          }}
          type="IMAGE"
          onSelect={handleMediaSelect}
        />
      )}
    </form>
  );
}

