"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  return <LoginForm urlError={urlError} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Laden...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}// Verhindere Prerendering für diese Route
export const dynamic = 'force-dynamic';