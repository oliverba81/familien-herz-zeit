import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { videoAccessRequestSchema } from "@/lib/validations/video-access";
import { generateToken } from "@/lib/utils/token";
import { sendEmail } from "@/lib/email/mailer";
import { renderVideoAccessEmail } from "@/lib/email/templates/videoAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/video-access/request
 * Erstellt einen Access Token für einen Videokurs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validierung
    const validatedData = videoAccessRequestSchema.parse(body);

    // Honeypot: Wenn website Feld gefüllt ist, antworte ok aber speichere nichts
    if (validatedData.website) {
      return NextResponse.json(
        { message: "Vielen Dank für Ihre Anfrage!" },
        { status: 200 }
      );
    }

    // Prüfe ob Kurs existiert und veröffentlicht ist
    const course = await db.videoCourse.findUnique({
      where: { id: validatedData.videoCourseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Videokurs nicht gefunden" },
        { status: 404 }
      );
    }

    if (course.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Videokurs ist nicht verfügbar" },
        { status: 400 }
      );
    }

    // Erstelle Token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 Stunden Gültigkeit

    const accessToken = await db.videoAccessToken.create({
      data: {
        token,
        videoCourseId: course.id,
        email: validatedData.email,
        expiresAt,
      },
    });

    // Baue absolute URL
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const watchUrl = new URL(`/videokurse/watch/${token}`, baseUrl).toString();

    let mailSent = false;

    // Sende E-Mail mit Access-Link
    try {
      const email = renderVideoAccessEmail({
        courseTitle: course.title,
        watchUrl,
        expiresAt: accessToken.expiresAt,
      });

      await sendEmail({
        to: validatedData.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });

      mailSent = true;
    } catch (error: any) {
      console.error("[VideoAccess] Failed to send email:", error);
    }

    return NextResponse.json({
      watchUrl,
      expiresAt: accessToken.expiresAt.toISOString(),
      mailSent,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Fehler beim Erstellen des Access Tokens:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

