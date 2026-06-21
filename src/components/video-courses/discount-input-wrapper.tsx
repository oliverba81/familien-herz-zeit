"use client";

import Link from "next/link";
import { useState } from "react";
import PurchaseButton from "./purchase-button";
import PaypalButton from "./paypal-button";
import BankTransferButton, {
  type VideoBankTransferDetails,
} from "./bank-transfer-button";
import DiscountInput from "./discount-input";
import { formatCents } from "@/lib/utils/money";

interface DiscountInputWrapperProps {
  videoCourseId: string;
  priceCents: number;
  /** Im Checkout anbietbare Zahlungsarten (im Admin konfigurierbar). */
  enabledMethods?: { stripe: boolean; paypal: boolean; bankTransfer: boolean };
}

// Statische, prop-lose Trenn-Komponente — auf Modulebene (nicht im Render
// definieren), damit React sie nicht bei jedem Render neu erstellt.
function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white text-gray-500">oder</span>
      </div>
    </div>
  );
}

export default function DiscountInputWrapper({
  videoCourseId,
  priceCents,
  enabledMethods = { stripe: true, paypal: true, bankTransfer: false },
}: DiscountInputWrapperProps) {
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<VideoBankTransferDetails | null>(
    null
  );

  const handleCodeChange = (code: string | null) => {
    setDiscountCode(code);
    setDiscountError(null);
  };

  const handlePurchaseError = (error: string) => {
    setDiscountError(error);
  };

  const noMethods =
    !enabledMethods.stripe && !enabledMethods.paypal && !enabledMethods.bankTransfer;

  // Nach erfolgreicher Überweisungs-Bestellung: Bankdaten anzeigen
  if (bankDetails) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-5">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Bestellung angelegt – bitte überweisen
        </h3>
        <p className="text-sm text-green-700 mb-4">
          Dein Zugang wird freigeschaltet, sobald die Zahlung bei uns eingegangen
          ist. Du erhältst die Zugangs-E-Mail nach Bestätigung.
        </p>
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <dl className="text-sm text-gray-700 space-y-1">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Betrag</dt>
              <dd className="font-semibold">{formatCents(bankDetails.amountCents)}</dd>
            </div>
            {bankDetails.accountHolder && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Kontoinhaber</dt>
                <dd className="font-medium text-right">{bankDetails.accountHolder}</dd>
              </div>
            )}
            {bankDetails.iban && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">IBAN</dt>
                <dd className="font-mono text-right">{bankDetails.iban}</dd>
              </div>
            )}
            {bankDetails.bic && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">BIC</dt>
                <dd className="font-mono text-right">{bankDetails.bic}</dd>
              </div>
            )}
            {bankDetails.bankName && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Bank</dt>
                <dd className="text-right">{bankDetails.bankName}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Verwendungszweck</dt>
              <dd className="font-medium text-right">{bankDetails.reference}</dd>
            </div>
          </dl>
          {bankDetails.info && (
            <p className="text-xs text-gray-600 mt-3 whitespace-pre-line">
              {bankDetails.info}
            </p>
          )}
        </div>
      </div>
    );
  }

  const showDividerBeforePaypal = enabledMethods.stripe && enabledMethods.paypal;
  const showDividerBeforeBank =
    (enabledMethods.stripe || enabledMethods.paypal) && enabledMethods.bankTransfer;

  return (
    <div className="space-y-3">
      <DiscountInput onCodeChange={handleCodeChange} error={discountError} />
      {noMethods && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Derzeit ist keine Zahlung verfügbar. Bitte{" "}
          <Link href="/kontakt" className="underline hover:text-yellow-900">
            kontaktiere uns
          </Link>
          .
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
      {showDividerBeforePaypal && <Divider />}
      {enabledMethods.paypal && (
        <PaypalButton
          videoCourseId={videoCourseId}
          priceCents={priceCents}
          discountCode={discountCode}
          onError={handlePurchaseError}
        />
      )}
      {showDividerBeforeBank && <Divider />}
      {enabledMethods.bankTransfer && (
        <BankTransferButton
          videoCourseId={videoCourseId}
          discountCode={discountCode}
          onError={handlePurchaseError}
          onSuccess={(details) => setBankDetails(details)}
        />
      )}
    </div>
  );
}
