"use client";

import { useEffect, useState } from "react";

interface Props {
  shareToken: string;
}

export default function FeedbackShareLink({ shareToken }: Props) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/feedback/${shareToken}`);
  }, [shareToken]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Öffentlicher Link
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          readOnly
          value={url}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {copied ? "Kopiert!" : "Kopieren"}
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-2"
          >
            Öffnen
          </a>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Nur ein veröffentlichter Bogen kann ausgefüllt werden.
      </p>
    </div>
  );
}
