"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: typeof window !== "undefined" ? `${window.location.origin}/` : "/" })}
      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg transition-colors duration-200"
    >
      Abmelden
    </button>
  );
}

