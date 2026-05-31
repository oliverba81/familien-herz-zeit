"use client";

import { useState } from "react";
import PurchaseButton from "./purchase-button";
import PaypalButton from "./paypal-button";
import DiscountInput from "./discount-input";

interface DiscountInputWrapperProps {
  videoCourseId: string;
  priceCents: number;
}

export default function DiscountInputWrapper({
  videoCourseId,
  priceCents,
}: DiscountInputWrapperProps) {
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const handleCodeChange = (code: string | null) => {
    setDiscountCode(code);
    setDiscountError(null);
  };

  const handlePurchaseError = (error: string) => {
    setDiscountError(error);
  };

  return (
    <div className="space-y-3">
      <DiscountInput onCodeChange={handleCodeChange} error={discountError} />
      <PurchaseButton
        videoCourseId={videoCourseId}
        priceCents={priceCents}
        discountCode={discountCode}
        onError={handlePurchaseError}
      />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">oder</span>
        </div>
      </div>
      <PaypalButton
        videoCourseId={videoCourseId}
        priceCents={priceCents}
        discountCode={discountCode}
        onError={handlePurchaseError}
      />
    </div>
  );
}

