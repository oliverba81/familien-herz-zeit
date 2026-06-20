"use client";

import { useState } from "react";
import { PageContent } from "@/lib/page-builder/types";
import { validatePageContent } from "@/lib/page-builder/validate";
import ErrorMessage from "@/components/auth/error-message";

interface AdvancedJSONProps {
  value: PageContent;
  onChange: (content: PageContent) => void;
  onError: (error: string) => void;
}

export default function AdvancedJSON({
  value,
  onChange,
  onError,
}: AdvancedJSONProps) {
  const [jsonString, setJsonString] = useState(
    JSON.stringify(value, null, 2)
  );
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonString);
      const validation = validatePageContent(parsed);

      if (!validation.success) {
        setError(validation.error || "Ungültiges Format");
        onError(validation.error || "Ungültiges Format");
        return;
      }

      onChange(validation.data!);
      setError(null);
      onError("");
    } catch (e: any) {
      const errorMsg = "Ungültiges JSON: " + e.message;
      setError(errorMsg);
      onError(errorMsg);
    }
  };

  const handleExport = () => {
    setJsonString(JSON.stringify(value, null, 2));
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Advanced JSON Editor</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="px-3 py-1 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600"
          >
            Import
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <textarea
        value={jsonString}
        onChange={(e) => setJsonString(e.target.value)}
        rows={20}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-mono text-sm"
        placeholder='{"version": 1, "blocks": [...]}'
      />

      <p className="text-xs text-gray-500">
        ⚠️ Vorsicht: Ungültiges JSON kann zu Datenverlust führen. Verwende "Export"
        um den aktuellen Stand zu sehen.
      </p>
    </div>
  );
}

