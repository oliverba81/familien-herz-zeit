import Link from "next/link";
import { formatCents } from "@/lib/utils/money";

interface Invoice {
  id: string;
  invoiceNumber: string;
  createdAt: Date;
  pdfUrl: string;
  purchase: {
    provider: "STRIPE" | "PAYPAL";
    amountCents: number;
    email: string;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
    videoCourse: {
      title: string;
      slug: string;
    };
  };
}

interface InvoicesTableProps {
  invoices: Invoice[];
}

export default function InvoicesTable({ invoices }: InvoicesTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Noch keine Rechnungen vorhanden.
      </div>
    );
  }

  const formatCustomerName = (invoice: Invoice): string => {
    if (invoice.purchase.user) {
      const name = `${invoice.purchase.user.firstName || ""} ${invoice.purchase.user.lastName || ""}`.trim();
      return name || invoice.purchase.user.email;
    }
    return invoice.purchase.email;
  };

  const formatPaymentMethod = (provider: "STRIPE" | "PAYPAL"): string => {
    return provider === "STRIPE" ? "Karte" : "PayPal";
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rechnungsnummer
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kurs
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kunde
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Betrag
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Zahlungsart
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Datum
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Aktionen
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {invoice.invoiceNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {invoice.purchase.videoCourse.title}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatCustomerName(invoice)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCents(invoice.purchase.amountCents)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatPaymentMethod(invoice.purchase.provider)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(invoice.createdAt).toLocaleDateString("de-DE")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <Link
                  href={invoice.pdfUrl}
                  target="_blank"
                  className="text-rose-500 hover:text-rose-600"
                >
                  Herunterladen
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

