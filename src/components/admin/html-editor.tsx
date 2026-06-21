"use client";

import { useState } from "react";

interface HtmlEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
}

export default function HtmlEditor({
  label,
  value,
  onChange,
  placeholder = "HTML-Code hier eingeben...",
  helpText,
}: HtmlEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          {isExpanded ? "▼ Verkleinern" : "▶ Erweitern"}
        </button>
      </div>
      
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono text-sm ${
            isExpanded ? "h-96" : "h-32"
          }`}
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
            tabSize: 2,
          }}
        />
        {value && (
          <div className="absolute top-2 right-2 text-xs text-gray-400">
            {value.length} Zeichen
          </div>
        )}
      </div>
      
      {helpText && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <p className="font-semibold mb-1">💡 Hinweis:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Verwende HTML-Tags wie &lt;div&gt;, &lt;nav&gt;, &lt;header&gt;, etc.</li>
          <li>Tailwind CSS-Klassen können verwendet werden (z.B. className=&quot;bg-white&quot;)</li>
          <li>Für dynamische Inhalte (Navigation, Logo) werden die Standard-Komponenten verwendet, wenn kein HTML gesetzt ist</li>
          <li>Wenn HTML gesetzt ist, wird es anstelle der Standard-Komponenten gerendert</li>
        </ul>
      </div>
    </div>
  );
}


