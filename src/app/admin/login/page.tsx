"use client";

import { useSearchParams } from "next/navigation";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  return <LoginForm urlError={urlError} />;
}

