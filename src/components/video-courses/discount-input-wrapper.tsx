"use client";

import { useState } from "react";
import PurchaseButton from "./purchase-button";
import PaypalButton from "./paypal-button";
import DiscountInput from "./discount-input";

interface DiscountInputWrapperProps {
  videoCourseId: string;
  priceCents: number;
  /** Im Checkout anbietbare Zahlungsarten (im Admin konfigurierbar). */
  enabledMethods?: { stripe: boolean; paypal: boolean };
}

export default function DiscountInputWrapper({
  videoCourseId,
  priceCents,
  enabledMethods = { stripe: true, paypal: true },
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

  const noMethods = !enabledMethods.stripe && !enabledMethods.paypal;

  return (
    <div className="space-y-3">
      <DiscountInput onCodeChange={handleCodeChange} error={discountError} />
      {noMethods && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Derzeit ist keine Online-Zahlung verfügbar. Bitte kontaktiere uns.
        </div>
      )}
      {enabledMethods.stripe && (
        <PurchaseButton
          videoCourseId={videoCourseId}
          priceCents={priceCents}
          discountCode={discountCode}
          onError={handlePurchaseError}
        />
      )}
      {enabledMethods.stripe && enabledMethods.paypal && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">oder</span>
          </div>
        </div>
      )}
      {enabledMethods.paypal && (
        <PaypalButton
          videoCourseId={videoCourseId}
          priceCents={priceCents}
          discountCode={discountCode}
          onError={handlePurchaseError}
        />
      )}
    </div>
  );
}

