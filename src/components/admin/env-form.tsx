"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

interface EnvVars {
  OPENAI_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: string;
  MAIL_FROM?: string;
  MAIL_ADMIN_TO?: string;
  APP_BASE_URL?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_MODE?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export default function EnvForm() {
  const [envVars, setEnvVars] = useState<EnvVars>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EnvVars>();

  useEffect(() => {
    loadEnvVars();
  }, []);

  const loadEnvVars = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/env");
      if (!response.ok) {
        throw new Error("Fehler beim Laden der Environment-Variablen");
      }
      const data = await response.json();
      setEnvVars(data);
      
      // Setze Werte im Formular
      Object.keys(data).forEach((key) => {
        setValue(key as keyof EnvVars, data[key]);
      });
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: EnvVars) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/admin/env", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Speichern");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Lade Variablen neu
      await loadEnvVars();
    } catch (err: any) {
      setError(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">Lade Environment-Variablen...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Environment-Variablen erfolgreich aktualisiert. Bitte starten Sie den Server neu, damit die Änderungen wirksam werden.
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Hinweis:</strong> Nach dem Speichern müssen Sie den Server neu starten, damit die Änderungen wirksam werden.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              {...register("OPENAI_API_KEY")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              placeholder="sk-..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Für HTML-Optimierung mit ChatGPT
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SMTP E-Mail Konfiguration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  {...register("SMTP_HOST")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="smtp.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port
                </label>
                <input
                  type="text"
                  {...register("SMTP_PORT")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="587"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Benutzer
                </label>
                <input
                  type="text"
                  {...register("SMTP_USER")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="your-email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Passwort
                </label>
                <input
                  type="password"
                  {...register("SMTP_PASS")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Secure
                </label>
                <select
                  {...register("SMTP_SECURE")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                >
                  <option value="false">false (STARTTLS)</option>
                  <option value="true">true (SSL)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">E-Mail Einstellungen</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Absender E-Mail
                </label>
                <input
                  type="text"
                  {...register("MAIL_FROM")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="Familien Herz Zeit <noreply@example.com>"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin E-Mail
                </label>
                <input
                  type="email"
                  {...register("MAIL_ADMIN_TO")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="admin@example.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Empfänger für Kontaktanfragen
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Base URL
              </label>
              <input
                type="url"
                {...register("APP_BASE_URL")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                placeholder="http://localhost:3000"
              />
              <p className="mt-1 text-xs text-gray-500">
                Basis-URL der Anwendung (für absolute Links in E-Mails)
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PayPal Konfiguration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PayPal Client ID
                </label>
                <input
                  type="text"
                  {...register("PAYPAL_CLIENT_ID")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="Client ID von PayPal Developer Dashboard"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PayPal Client Secret
                </label>
                <input
                  type="password"
                  {...register("PAYPAL_CLIENT_SECRET")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PayPal Mode
                </label>
                <select
                  {...register("PAYPAL_MODE")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                >
                  <option value="sandbox">Sandbox (Test)</option>
                  <option value="live">Live (Production)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Sandbox für Tests, Live für Produktion
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stripe Konfiguration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stripe Secret Key
                </label>
                <input
                  type="password"
                  {...register("STRIPE_SECRET_KEY")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="sk_..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Secret Key von Stripe Dashboard
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stripe Publishable Key
                </label>
                <input
                  type="text"
                  {...register("STRIPE_PUBLISHABLE_KEY")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="pk_..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Publishable Key für Frontend-Integration
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stripe Webhook Secret
                </label>
                <input
                  type="password"
                  {...register("STRIPE_WEBHOOK_SECRET")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="whsec_..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Webhook Signing Secret (optional, für Webhook-Validierung)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={loadEnvVars}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? "Speichere..." : "Speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}

