"use client";

import { useState } from "react";

interface DiscountInputProps {
  onCodeChange: (code: string | null) => void;
  error?: string | null;
}

export default function DiscountInput({ onCodeChange, error }: DiscountInputProps) {
  const [code, setCode] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().trim();
    setCode(value);
    onCodeChange(value || null);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Rabattcode (optional)
      </label>
      <input
        type="text"
        value={code}
        onChange={handleChange}
        placeholder="z.B. WELCOME10"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}



