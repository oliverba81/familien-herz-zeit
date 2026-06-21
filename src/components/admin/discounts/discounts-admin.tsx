"use client";

import { useState, useEffect, useCallback } from "react";
import { DiscountProvider, DiscountType } from "@prisma/client";
import { formatCents, parseEuroToCents } from "@/lib/utils/money";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface DiscountCode {
  id: string;
  provider: DiscountProvider;
  code: string;
  type: DiscountType;
  percentOff: number | null;
  amountOffCents: number | null;
  currency: string;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  restrictToVideoCourseId: string | null;
  videoCourse: {
    id: string;
    title: string;
    slug: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VideoCourse {
  id: string;
  title: string;
  slug: string;
}

export default function DiscountsAdmin() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [videoCourses, setVideoCourses] = useState<VideoCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    provider: "LOCAL" as DiscountProvider,
    type: "PERCENT" as DiscountType,
    percentOff: "",
    amountOffCents: "",
    currency: "eur",
    isActive: true,
    startsAt: "",
    endsAt: "",
    maxRedemptions: "",
    restrictToVideoCourseId: "",
  });

  const fetchDiscounts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/discounts");
      if (!response.ok) throw new Error("Fehler beim Laden der Rabattcodes");
      const data = await response.json();
      setDiscounts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVideoCourses = useCallback(async () => {
    try {
      const response = await fetch("/api/video-courses");
      if (response.ok) {
        const data = await response.json();
        setVideoCourses(data);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Videokurse:", err);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.all([fetchDiscounts(), fetchVideoCourses()]);
    })();
  }, [fetchDiscounts, fetchVideoCourses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const payload: any = {
        code: formData.code.toUpperCase().trim(),
        provider: formData.provider,
        type: formData.type,
        currency: formData.currency,
        isActive: formData.isActive,
      };

      if (formData.type === "PERCENT") {
        const percent = parseInt(formData.percentOff, 10);
        if (Number.isNaN(percent) || percent <= 0 || percent > 100) {
          setError("Bitte einen gültigen Prozentwert zwischen 1 und 100 eingeben.");
          setCreating(false);
          return;
        }
        payload.percentOff = percent;
      } else {
        const amountOffCents = parseEuroToCents(formData.amountOffCents);
        if (amountOffCents === null || amountOffCents <= 0) {
          setError("Bitte einen gültigen Rabattbetrag eingeben.");
          setCreating(false);
          return;
        }
        payload.amountOffCents = amountOffCents;
      }

      if (formData.startsAt) payload.startsAt = new Date(formData.startsAt).toISOString();
      if (formData.endsAt) payload.endsAt = new Date(formData.endsAt).toISOString();
      if (formData.maxRedemptions) payload.maxRedemptions = parseInt(formData.maxRedemptions);
      if (formData.restrictToVideoCourseId) payload.restrictToVideoCourseId = formData.restrictToVideoCourseId;

      const response = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Erstellen des Rabattcodes");
      }

      // Reset form
      setFormData({
        code: "",
        provider: "LOCAL",
        type: "PERCENT",
        percentOff: "",
        amountOffCents: "",
        currency: "eur",
        isActive: true,
        startsAt: "",
        endsAt: "",
        maxRedemptions: "",
        restrictToVideoCourseId: "",
      });
      setShowCreateForm(false);
      fetchDiscounts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/discounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (!response.ok) throw new Error("Fehler beim Aktualisieren");
      fetchDiscounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Lade Rabattcodes...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Alle Rabattcodes</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
        >
          {showCreateForm ? "Abbrechen" : "Neuer Rabattcode"}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Neuer Rabattcode</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="WELCOME10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider *
                </label>
                <select
                  required
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value as DiscountProvider })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="LOCAL">Local (PayPal)</option>
                  <option value="STRIPE">Stripe</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as DiscountType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="PERCENT">Prozent</option>
                  <option value="AMOUNT">Fester Betrag</option>
                </select>
              </div>

              {formData.type === "PERCENT" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prozent Rabatt *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={formData.percentOff}
                    onChange={(e) => setFormData({ ...formData, percentOff: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Betrag (€) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amountOffCents}
                    onChange={(e) => setFormData({ ...formData, amountOffCents: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gültig ab (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gültig bis (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max. Einlösungen (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nur für Videokurs (optional)
                </label>
                <select
                  value={formData.restrictToVideoCourseId}
                  onChange={(e) => setFormData({ ...formData, restrictToVideoCourseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Alle Videokurse</option>
                  {videoCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Aktiv
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50"
              >
                {creating ? "Wird erstellt..." : "Erstellen"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wert</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Einlösungen</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Eingeschränkt</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gültigkeit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {discounts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  Keine Rabattcodes vorhanden
                </td>
              </tr>
            ) : (
              discounts.map((discount) => (
                <tr key={discount.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                    {discount.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      discount.provider === "STRIPE" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {discount.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {discount.type === "PERCENT" ? "Prozent" : "Betrag"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {discount.type === "PERCENT"
                      ? `${discount.percentOff}%`
                      : formatCents(discount.amountOffCents || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      discount.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {discount.isActive ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {discount.timesRedeemed}
                    {discount.maxRedemptions && ` / ${discount.maxRedemptions}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {discount.videoCourse ? (
                      <span className="text-xs">{discount.videoCourse.title}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {discount.startsAt || discount.endsAt ? (
                      <div className="text-xs">
                        {discount.startsAt && (
                          <div>Ab: {format(new Date(discount.startsAt), "dd.MM.yyyy", { locale: de })}</div>
                        )}
                        {discount.endsAt && (
                          <div>Bis: {format(new Date(discount.endsAt), "dd.MM.yyyy", { locale: de })}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleToggleActive(discount.id, discount.isActive)}
                      className={`px-3 py-1 text-xs rounded ${
                        discount.isActive
                          ? "bg-red-100 text-red-800 hover:bg-red-200"
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }`}
                    >
                      {discount.isActive ? "Deaktivieren" : "Aktivieren"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

