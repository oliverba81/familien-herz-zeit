"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

export default function SuccessPageClient() {
  useEffect(() => {
    // Analytics Event: Purchase success (Stripe)
    track("purchase_success", { provider: "stripe" });
  }, []);

  return null; // Keine UI, nur Tracking
}



