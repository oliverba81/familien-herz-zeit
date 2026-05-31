import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/lib/db";
import { bookingSchema } from "@/lib/validations/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createCheckoutSchema = z.object({
  bookingData: bookingSchema,
});

/**
 * POST /api/course-bookings/create-checkout-session
 * Erstellt eine Stripe Checkout Session für eine Kursbuchung
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createCheckoutSchema.parse(body);
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

    // Erstelle Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: course.title,
              description: course.description?.substring(0, 500) || "",
            },
            unit_amount: course.priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/kurse/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/kurse/${course.id}?canceled=1`,
      customer_email: bookingData.email,
      metadata: {
        type: "course_booking",
        courseId: course.id,
        bookingData: JSON.stringify(bookingData), // Speichere Buchungsdaten in Metadata
      },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
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

    console.error("[Course Booking Checkout] Error:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Erstellen der Checkout-Session" },
      { status: 500 }
    );
  }
}

