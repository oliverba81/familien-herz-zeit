import { Metadata } from "next";
import PaypalCaptureClient from "@/components/video-courses/paypal-capture-client";

export const metadata: Metadata = {
  title: "PayPal Zahlung erfolgreich",
  description: "Vielen Dank für Ihren Kauf",
};

interface SuccessPageProps {
  searchParams: Promise<{ token?: string; courseId?: string }>;
}

export default async function PaypalSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const orderId = params.token; // PayPal liefert orderId als "token" query param

  if (!orderId) {
    return (
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Fehler
            </h1>
            <p className="text-gray-600 mb-6">
              Keine Order-ID gefunden. Bitte kontaktieren Sie uns, wenn Sie eine Zahlung getätigt haben.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <PaypalCaptureClient orderId={orderId} />
        </div>
      </div>
    </div>
  );
}

