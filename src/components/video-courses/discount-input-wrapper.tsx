"use client";

import Link from "next/link";
import { useState } from "react";
import PurchaseButton from "./purchase-button";
import PaypalButton from "./paypal-button";
import BankTransferButton, {
  type VideoBankTransferDetails,
} from "./bank-transfer-button";
import DiscountInput from "./discount-input";
import LegalContentModal from "@/components/courses/legal-content-modal";
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
  // Pflicht-Einwilligungen vor dem Kauf digitaler Inhalte
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [withdrawalConsent, setWithdrawalConsent] = useState(false);
  const [legalModal, setLegalModal] = useState<"agb" | "privacy" | null>(null);

  const allConsentsGiven = agbAccepted && privacyAccepted && withdrawalConsent;

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

      {!noMethods && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="video-agb"
              checked={agbAccepted}
              onChange={(e) => setAgbAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
            />
            <label htmlFor="video-agb" className="ml-2 text-sm text-gray-700">
              Ich habe die{" "}
              <button
                type="button"
                onClick={() => setLegalModal("agb")}
                className="text-rose-500 hover:text-rose-600 underline"
              >
                AGB
              </button>{" "}
              zur Kenntnis genommen und erkenne sie an. *
            </label>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="video-privacy"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
            />
            <label htmlFor="video-privacy" className="ml-2 text-sm text-gray-700">
              Ich habe die{" "}
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="text-rose-500 hover:text-rose-600 underline"
              >
                Datenschutzerklärung
              </button>{" "}
              zur Kenntnis genommen. *
            </label>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="video-withdrawal"
              checked={withdrawalConsent}
              onChange={(e) => setWithdrawalConsent(e.target.checked)}
              className="mt-1 h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
            />
            <label htmlFor="video-withdrawal" className="ml-2 text-sm text-gray-700">
              Ich verlange ausdrücklich, dass mit der Bereitstellung des Videokurses vor Ablauf der
              Widerrufsfrist begonnen wird. Mir ist bekannt, dass ich dadurch mein Widerrufsrecht
              verliere. *
            </label>
          </div>

          {!allConsentsGiven && (
            <p className="text-xs text-gray-500">
              Bitte bestätige alle drei Punkte, um den Kauf abzuschließen.
            </p>
          )}
        </div>
      )}

      {allConsentsGiven && (
        <>
          {enabledMethods.stripe && (
            <PurchaseButton
              videoCourseId={videoCourseId}
              priceCents={priceCents}
              discountCode={discountCode}
              withdrawalConsent={withdrawalConsent}
              onError={handlePurchaseError}
            />
          )}
          {showDividerBeforePaypal && <Divider />}
          {enabledMethods.paypal && (
            <PaypalButton
              videoCourseId={videoCourseId}
              priceCents={priceCents}
              discountCode={discountCode}
              withdrawalConsent={withdrawalConsent}
              onError={handlePurchaseError}
            />
          )}
          {showDividerBeforeBank && <Divider />}
          {enabledMethods.bankTransfer && (
            <BankTransferButton
              videoCourseId={videoCourseId}
              discountCode={discountCode}
              withdrawalConsent={withdrawalConsent}
              onError={handlePurchaseError}
              onSuccess={(details) => setBankDetails(details)}
            />
          )}
        </>
      )}

      <LegalContentModal
        slug="agb"
        title="AGB"
        open={legalModal === "agb"}
        onClose={() => setLegalModal(null)}
      />
      <LegalContentModal
        slug="datenschutzerklaerung"
        title="Datenschutzerklärung"
        open={legalModal === "privacy"}
        onClose={() => setLegalModal(null)}
      />
    </div>
  );
}
