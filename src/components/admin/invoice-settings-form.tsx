"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

interface InvoiceSettings {
  id: string;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyZip: string;
  companyCountry: string;
  companyTaxId: string | null;
  companyVatId: string | null;
  taxRate: number;
  invoiceNumberPrefix: string | null;
  invoiceNumberSuffix: string | null;
  invoiceNumberStart: number;
  isSmallBusiness: boolean;
}

interface InvoiceSettingsFormProps {
  initialSettings: InvoiceSettings;
}

export default function InvoiceSettingsForm({
  initialSettings,
}: InvoiceSettingsFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceSettings>({
    defaultValues: initialSettings,
  });

  const onSubmit = async (data: InvoiceSettings) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/admin/invoice-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMessage = "Fehler beim Speichern";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Wenn Response kein JSON ist, verwende Status-Text
          errorMessage = `Fehler: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

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
            Einstellungen erfolgreich gespeichert
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Firmendaten</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Firmenname *
            </label>
            <input
              {...register("companyName", { required: "Firmenname ist erforderlich" })}
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Straße und Hausnummer *
            </label>
            <input
              {...register("companyAddress", { required: "Adresse ist erforderlich" })}
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            {errors.companyAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.companyAddress.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PLZ *
              </label>
              <input
                {...register("companyZip", { required: "PLZ ist erforderlich" })}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
              {errors.companyZip && (
                <p className="mt-1 text-sm text-red-600">{errors.companyZip.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ort *
              </label>
              <input
                {...register("companyCity", { required: "Ort ist erforderlich" })}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
              {errors.companyCity && (
                <p className="mt-1 text-sm text-red-600">{errors.companyCity.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Land *
            </label>
            <input
              {...register("companyCountry", { required: "Land ist erforderlich" })}
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            {errors.companyCountry && (
              <p className="mt-1 text-sm text-red-600">{errors.companyCountry.message}</p>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Steuerinformationen</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Steuernummer (optional)
              </label>
              <input
                {...register("companyTaxId")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                USt-IdNr. (optional)
              </label>
              <input
                {...register("companyVatId")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MwSt-Satz (%) *
              </label>
              <input
                {...register("taxRate", {
                  required: "MwSt-Satz ist erforderlich",
                  valueAsNumber: true,
                  min: { value: 0, message: "MwSt-Satz muss >= 0 sein" },
                  max: { value: 100, message: "MwSt-Satz muss <= 100 sein" },
                })}
                type="number"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
              {errors.taxRate && (
                <p className="mt-1 text-sm text-red-600">{errors.taxRate.message}</p>
              )}
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input
                  {...register("isSmallBusiness")}
                  type="checkbox"
                  className="w-4 h-4 text-rose-500 border-gray-300 rounded focus:ring-rose-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Kleinunternehmerregelung nach § 19 UStG
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500 ml-6">
                Wenn aktiviert, wird auf der Rechnung der Hinweis auf die Steuerbefreiung nach § 19 Absatz 1 UStG angezeigt und keine Umsatzsteuer ausgewiesen.
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rechnungsnummern</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prefix (optional)
              </label>
              <input
                {...register("invoiceNumberPrefix")}
                type="text"
                placeholder="z.B. RE"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optionales Prefix für Rechnungsnummern (z.B. &quot;RE&quot; für &quot;RE20240001&quot;)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suffix (optional)
              </label>
              <input
                {...register("invoiceNumberSuffix")}
                type="text"
                placeholder="z.B. INV"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optionales Suffix für Rechnungsnummern (z.B. &quot;INV&quot; für &quot;RE20240001INV&quot;)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Startnummer *
              </label>
              <input
                {...register("invoiceNumberStart", {
                  required: "Startnummer ist erforderlich",
                  valueAsNumber: true,
                  min: { value: 1, message: "Startnummer muss >= 1 sein" },
                })}
                type="number"
                step="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Die Nummer, ab der die Rechnungsnummern starten sollen (z.B. 1 für &quot;0001&quot;)
              </p>
              {errors.invoiceNumberStart && (
                <p className="mt-1 text-sm text-red-600">{errors.invoiceNumberStart.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
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

