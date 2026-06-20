import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { paypalFetch } from "@/lib/paypal/client";
import { getPaymentConfig } from "@/lib/payment/config";
import { db } from "@/lib/db";
import { bookingSchema } from "@/lib/validations/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createOrderSchema = z.object({
  bookingData: bookingSchema,
});

/**
 * POST /api/course-bookings/create-paypal-order
 * Erstellt eine PayPal Order für eine Kursbuchung
 */
export async function POST(request: NextRequest) {
  try {
    // Prüfe, ob PayPal als Zahlungsart aktiviert und konfiguriert ist
    const paymentConfig = await getPaymentConfig();
    if (!paymentConfig.paypal.available) {
      return NextResponse.json(
        { error: "PayPal ist derzeit nicht verfügbar" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);
    const bookingData = validatedData.bookingData;

    // Lade Kurs
    const course = await db.course.findUnique({
      where: { id: bookingData.courseId },
      include: {
        sessions: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Kurs nicht gefunden" },
        { status: 404 }
      );
    }

    // Prüfe Kurs-Status
    if (course.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Kurs ist nicht verfügbar" },
        { status: 400 }
      );
    }

    // Prüfe ob Zahlung erforderlich ist
    if (bookingData.hasAokVoucher && course.acceptsAokVoucher) {
      return NextResponse.json(
        { error: "Bei AOK-Gutschein ist keine Zahlung erforderlich" },
        { status: 400 }
      );
    }

    if (course.priceCents <= 0) {
      return NextResponse.json(
        { error: "Kurs ist kostenlos, keine Zahlung erforderlich" },
        { status: 400 }
      );
    }

    // Prüfe Kapazität
    const bookingCount = await db.booking.count({
      where: {
        courseId: course.id,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
    });

    if (bookingCount >= course.maxParticipants) {
      return NextResponse.json(
        { error: "Kurs ist ausgebucht" },
        { status: 409 }
      );
    }

    // Finde erste zukünftige Session
    const now = new Date();
    const firstSession = course.sessions.find(
      (s) => new Date(s.startAt) >= now
    );

    if (!firstSession) {
      return NextResponse.json(
        { error: "Kurs hat keine zukünftigen Termine" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const amountValue = (course.priceCents / 100).toFixed(2);

    // Erstelle PayPal Order
    // Struktur identisch mit funktionierender Video-Course-Version
    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: course.id,
          amount: {
            currency_code: "EUR",
            value: amountValue,
          },
        },
      ],
      application_context: {
        return_url: `${baseUrl}/kurse/booking/paypal/success?courseId=${course.id}`,
        cancel_url: `${baseUrl}/kurse/${course.id}?canceled=1`,
        brand_name: "Familien Herz Zeit",
        user_action: "PAY_NOW",
      },
    };

    const order = await paypalFetch("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });

    // Finde approve URL
    const approveLink = order.links?.find(
      (link: any) => link.rel === "approve"
    );

    if (!approveLink || !approveLink.href) {
      throw new Error("PayPal approve URL nicht gefunden");
    }

    // Speichere Buchungsdaten temporär (z.B. in Session oder Cookie)
    // Für jetzt speichern wir sie in der PayPal Order Metadata
    // Später werden sie im Capture-Handler verwendet

    return NextResponse.json({
      approveUrl: approveLink.href,
      orderId: order.id,
      bookingData: bookingData, // Zurückgeben, damit Frontend sie speichern kann
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Ungültige Eingabedaten",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error("[Course Booking PayPal] Error:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Erstellen der PayPal Order" },
      { status: 500 }
    );
  }
}

