"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { getPlaceholdersForTemplate } from "@/lib/email/template-placeholders";
import TinyMCEEmailEditor from "@/components/admin/tinymce-email-editor";

interface EmailTemplate {
  id: string | null;
  type: string;
  name: string;
  description?: string | null;
  subject: string;
  textBody: string;
  htmlBody: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface EmailTemplatesData {
  templates: EmailTemplate[];
  availableTypes: string[];
}

export default function EmailTemplatesForm() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/email-templates");
      if (!response.ok) {
        throw new Error("Fehler beim Laden der E-Mail-Templates");
      }
      const data: EmailTemplatesData = await response.json();
      setTemplates(data.templates);
      if (data.templates.length > 0 && !activeTab) {
        setActiveTab(data.templates[0].type);
      }
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: EmailTemplate) => {
    try {
      setSaving(template.type);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: template.type,
          name: template.name,
          description: template.description,
          subject: template.subject,
          textBody: template.textBody,
          htmlBody: template.htmlBody,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Speichern");
      }

      setSuccess(template.type);
      setTimeout(() => setSuccess(null), 3000);

      // Lade Templates neu
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(null);
    }
  };

  const updateTemplate = (type: string, field: keyof EmailTemplate, value: any) => {
    setTemplates((prev) =>
      prev.map((t) => (t.type === type ? { ...t, [field]: value } : t))
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">Lade E-Mail-Templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            {templates.map((template) => (
              <button
                key={template.type}
                onClick={() => setActiveTab(template.type)}
                className={`
                  px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${
                    activeTab === template.type
                      ? "border-pink-500 text-pink-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {template.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Template Editor */}
        {templates.map((template) => {
          if (activeTab !== template.type) return null;

          return (
            <div key={template.type} className="p-6 space-y-6">
              {success === template.type && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  Template erfolgreich gespeichert!
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => updateTemplate(template.type, "name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              {template.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <p className="text-sm text-gray-500">{template.description}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Betreff
                </label>
                <input
                  type="text"
                  value={template.subject}
                  onChange={(e) => updateTemplate(template.type, "subject", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  placeholder="E-Mail-Betreff"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text-Version (Plain Text)
                </label>
                <textarea
                  value={template.textBody}
                  onChange={(e) => updateTemplate(template.type, "textBody", e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 font-mono text-sm"
                  placeholder="Text-Version der E-Mail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HTML-Version
                </label>
                <TinyMCEEmailEditor
                  content={template.htmlBody || ""}
                  onChange={(html) => updateTemplate(template.type, "htmlBody", html)}
                />
                <p className="mt-2 text-xs text-gray-500">
                  <strong>Tipp:</strong> Verwenden Sie den WYSIWYG-Editor für visuelle Bearbeitung. Platzhalter wie {"{{courseTitle}}"} bleiben erhalten und werden beim Versenden automatisch ersetzt.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => saveTemplate(template)}
                  disabled={saving === template.type}
                  className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === template.type ? "Speichere..." : "Template speichern"}
                </button>
              </div>

              {/* Platzhalter-Legende - klein am Ende */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1.5">
                  <strong>Verfügbare Platzhalter:</strong>
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                  {getPlaceholdersForTemplate(template.type).map((placeholder, index) => (
                    <span key={placeholder.placeholder} className="inline-flex items-center gap-1">
                      <code className="text-xs font-mono text-gray-700 bg-gray-100 px-1 py-0.5 rounded">
                        {placeholder.placeholder}
                      </code>
                      <span className="text-gray-500">{placeholder.description}</span>
                      {index < getPlaceholdersForTemplate(template.type).length - 1 && (
                        <span className="text-gray-300 mx-0.5">•</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

