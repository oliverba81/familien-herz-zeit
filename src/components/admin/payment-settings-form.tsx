"use client";

import { useEffect, useState } from "react";

interface PaymentSettingsState {
  stripeEnabled: boolean;
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  hasStripeSecretKey: boolean;
  hasStripeWebhookSecret: boolean;

  paypalEnabled: boolean;
  paypalClientId: string;
  paypalClientSecret: string;
  hasPaypalClientSecret: boolean;
  paypalMode: "sandbox" | "live";

  bankTransferEnabled: boolean;
  bankAccountHolder: string;
  bankIban: string;
  bankBic: string;
  bankName: string;
  bankTransferInfo: string;
}

const EMPTY: PaymentSettingsState = {
  stripeEnabled: false,
  stripePublishableKey: "",
  stripeSecretKey: "",
  stripeWebhookSecret: "",
  hasStripeSecretKey: false,
  hasStripeWebhookSecret: false,
  paypalEnabled: false,
  paypalClientId: "",
  paypalClientSecret: "",
  hasPaypalClientSecret: false,
  paypalMode: "sandbox",
  bankTransferEnabled: false,
  bankAccountHolder: "",
  bankIban: "",
  bankBic: "",
  bankName: "",
  bankTransferInfo: "",
};

const inputClass =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function PaymentSettingsForm() {
  const [state, setState] = useState<PaymentSettingsState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/payment-settings");
      if (!res.ok) throw new Error("Fehler beim Laden der Zahlungseinstellungen");
      const data = await res.json();
      setState({
        ...EMPTY,
        ...data,
        // Secrets werden nie geladen – Felder bleiben leer
        stripeSecretKey: "",
        stripeWebhookSecret: "",
        paypalClientSecret: "",
      });
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const set = <K extends keyof PaymentSettingsState>(
    key: K,
    value: PaymentSettingsState[K]
  ) => setState((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const payload = {
        stripeEnabled: state.stripeEnabled,
        stripePublishableKey: state.stripePublishableKey,
        stripeSecretKey: state.stripeSecretKey,
        stripeWebhookSecret: state.stripeWebhookSecret,
        paypalEnabled: state.paypalEnabled,
        paypalClientId: state.paypalClientId,
        paypalClientSecret: state.paypalClientSecret,
        paypalMode: state.paypalMode,
        bankTransferEnabled: state.bankTransferEnabled,
        bankAccountHolder: state.bankAccountHolder,
        bankIban: state.bankIban,
        bankBic: state.bankBic,
        bankName: state.bankName,
        bankTransferInfo: state.bankTransferInfo,
      };

      const res = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fehler beim Speichern");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await load();
    } catch (err: any) {
      setError(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">Lade Zahlungseinstellungen…</div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Zahlungseinstellungen erfolgreich gespeichert.
        </div>
      )}

      {/* STRIPE */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            💳 Stripe (Kreditkarte)
          </h2>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={state.stripeEnabled}
              onChange={(e) => set("stripeEnabled", e.target.checked)}
              className="h-5 w-5 text-rose-500 rounded border-gray-300 focus:ring-rose-500"
            />
            <span className="ml-2 text-sm text-gray-700">Aktiviert</span>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>Publishable Key (pk_…)</label>
            <input
              type="text"
              value={state.stripePublishableKey}
              onChange={(e) => set("stripePublishableKey", e.target.value)}
              className={inputClass}
              placeholder="pk_live_…"
            />
          </div>
          <div>
            <label className={labelClass}>Secret Key (sk_…)</label>
            <input
              type="password"
              value={state.stripeSecretKey}
              onChange={(e) => set("stripeSecretKey", e.target.value)}
              className={inputClass}
              placeholder={
                state.hasStripeSecretKey
                  ? "•••••••• (gespeichert – leer lassen zum Behalten)"
                  : "sk_live_…"
              }
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={labelClass}>Webhook Secret (whsec_…)</label>
            <input
              type="password"
              value={state.stripeWebhookSecret}
              onChange={(e) => set("stripeWebhookSecret", e.target.value)}
              className={inputClass}
              placeholder={
                state.hasStripeWebhookSecret
                  ? "•••••••• (gespeichert – leer lassen zum Behalten)"
                  : "whsec_…"
              }
              autoComplete="new-password"
            />
          </div>
        </div>
      </section>

      {/* PAYPAL */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">🅿️ PayPal</h2>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={state.paypalEnabled}
              onChange={(e) => set("paypalEnabled", e.target.checked)}
              className="h-5 w-5 text-rose-500 rounded border-gray-300 focus:ring-rose-500"
            />
            <span className="ml-2 text-sm text-gray-700">Aktiviert</span>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>Client ID</label>
            <input
              type="text"
              value={state.paypalClientId}
              onChange={(e) => set("paypalClientId", e.target.value)}
              className={inputClass}
              placeholder="PayPal Client ID"
            />
          </div>
          <div>
            <label className={labelClass}>Client Secret</label>
            <input
              type="password"
              value={state.paypalClientSecret}
              onChange={(e) => set("paypalClientSecret", e.target.value)}
              className={inputClass}
              placeholder={
                state.hasPaypalClientSecret
                  ? "•••••••• (gespeichert – leer lassen zum Behalten)"
                  : "PayPal Client Secret"
              }
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={labelClass}>Modus</label>
            <select
              value={state.paypalMode}
              onChange={(e) =>
                set("paypalMode", e.target.value as "sandbox" | "live")
              }
              className={inputClass}
            >
              <option value="sandbox">Sandbox (Test)</option>
              <option value="live">Live</option>
            </select>
          </div>
        </div>
      </section>

      {/* ÜBERWEISUNG */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">🏦 Überweisung</h2>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={state.bankTransferEnabled}
              onChange={(e) => set("bankTransferEnabled", e.target.checked)}
              className="h-5 w-5 text-rose-500 rounded border-gray-300 focus:ring-rose-500"
            />
            <span className="ml-2 text-sm text-gray-700">Aktiviert</span>
          </label>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Bei Überweisung wird die Buchung mit offenem Zahlungsstatus angelegt; die
          Bankdaten werden dem Kunden angezeigt. Der Zahlungseingang wird manuell
          in den Buchungen bestätigt. (Nur für Präsenz-Kurse.)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Kontoinhaber</label>
            <input
              type="text"
              value={state.bankAccountHolder}
              onChange={(e) => set("bankAccountHolder", e.target.value)}
              className={inputClass}
              placeholder="Familien-Herz-Zeit"
            />
          </div>
          <div>
            <label className={labelClass}>Bank</label>
            <input
              type="text"
              value={state.bankName}
              onChange={(e) => set("bankName", e.target.value)}
              className={inputClass}
              placeholder="Sparkasse …"
            />
          </div>
          <div>
            <label className={labelClass}>IBAN</label>
            <input
              type="text"
              value={state.bankIban}
              onChange={(e) => set("bankIban", e.target.value)}
              className={inputClass}
              placeholder="DE00 0000 0000 0000 0000 00"
            />
          </div>
          <div>
            <label className={labelClass}>BIC</label>
            <input
              type="text"
              value={state.bankBic}
              onChange={(e) => set("bankBic", e.target.value)}
              className={inputClass}
              placeholder="ABCDDEFFXXX"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Hinweis / Zahlungsziel (optional)</label>
          <textarea
            value={state.bankTransferInfo}
            onChange={(e) => set("bankTransferInfo", e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="z. B. Bitte innerhalb von 7 Tagen überweisen. Der Platz ist erst nach Zahlungseingang verbindlich reserviert."
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
