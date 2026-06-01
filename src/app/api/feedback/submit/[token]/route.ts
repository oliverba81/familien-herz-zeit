import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { publicSubmitSchema } from "@/lib/validations/feedback";
import { parseQuestions, FeedbackAnswers } from "@/lib/feedback/types";
import { validateAnswers } from "@/lib/feedback/validate-answers";
import { checkRateLimit } from "@/lib/feedback/rate-limit";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/feedback/submit/:token  — ÖFFENTLICH (kein requireRole).
 * Honeypot, Rate-Limit, Consent-Pflicht (serverseitig), Antwort-Validierung.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const data = publicSubmitSchema.parse(body);

    // Honeypot: gefüllt -> still ok, kein Insert
    if (data.website && data.website.trim().length > 0) {
      return NextResponse.json({ ok: true });
    }

    const form = await db.feedbackForm.findUnique({
      where: { shareToken: token },
    });

    if (!form || form.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Formular nicht mehr verfügbar" },
        { status: 404 }
      );
    }

    // Rate-Limit (IP nur transient als Map-Key, nicht persistiert)
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    if (!checkRateLimit(`${ip}:${form.id}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
        { status: 429 }
      );
    }

    // Consent serverseitig erzwingen, wenn personenbezogene Daten erfasst werden
    if ((form.collectName || form.collectEmail) && !data.consent) {
      return NextResponse.json(
        { error: "Zustimmung zur Datenverarbeitung erforderlich" },
        { status: 400 }
      );
    }

    const questions = parseQuestions(form.questions);
    const result = validateAnswers(
      questions,
      data.answers as FeedbackAnswers
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Ungültige Antworten" },
        { status: 400 }
      );
    }

    const name =
      form.collectName && data.name && data.name.trim().length > 0
        ? data.name.trim()
        : null;
    const email =
      form.collectEmail && data.email && data.email.trim().length > 0
        ? data.email.trim()
        : null;

    await db.feedbackResponse.create({
      data: {
        formId: form.id,
        name,
        email,
        answers: result.cleaned as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Fehler beim Absenden des Feedbacks:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
