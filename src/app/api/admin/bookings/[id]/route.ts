import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit, getActorFromSession } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import { BookingStatus } from "@prisma/client";
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer";
import { renderEmailTemplate } from "@/lib/email/template-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateBookingSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
});

/**
 * PATCH /api/admin/bookings/[id]
 * Aktualisiert den Status einer Buchung
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Validierung
    const validatedData = updateBookingSchema.parse(body);

    // Prüfe ob Buchung existiert
    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        course: true,
        session: {
          select: {
            id: true,
            startAt: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Buchung nicht gefunden" },
        { status: 404 }
      );
    }

    // Speichere den alten Status für das Audit Log
    const oldStatus = booking.status;

    // Wenn Status auf CONFIRMED gesetzt wird, prüfe Kapazität
    if (validatedData.status === "CONFIRMED") {
      const confirmedCount = await db.booking.count({
        where: {
          courseId: booking.courseId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
      });

      // Wenn die aktuelle Buchung noch nicht CONFIRMED ist, zähle sie nicht doppelt
      const currentBookingIsConfirmed = booking.status === "CONFIRMED";
      const effectiveCount = currentBookingIsConfirmed ? confirmedCount : confirmedCount + 1;

      if (effectiveCount > booking.course.maxParticipants) {
        return NextResponse.json(
          { error: "Kurs ist ausgebucht" },
          { status: 409 }
        );
      }
    }

    // Aktualisiere Buchung
    const updatedBooking = await db.booking.update({
      where: { id },
      data: {
        status: validatedData.status,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            priceCents: true,
          },
        },
        session: {
          select: {
            id: true,
            startAt: true,
          },
        },
      },
    });

    // Audit Log
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "Booking",
        id: updatedBooking.id,
        label: `${updatedBooking.course.title} - ${booking.parentName}`,
      },
      action: AuditAction.STATUS_CHANGE,
      message: `Buchung Status geändert: ${oldStatus} → ${validatedData.status}`,
      meta: {
        oldStatus,
        newStatus: validatedData.status,
        courseTitle: updatedBooking.course.title,
      },
    });

    // Wenn Status auf CONFIRMED geändert wurde, sende Bestätigungs-E-Mail an Teilnehmer
    if (validatedData.status === "CONFIRMED" && oldStatus !== "CONFIRMED") {
      if (isEmailConfigured()) {
        try {
          // Hole erste zukünftige Session für E-Mail (falls nicht bereits vorhanden)
          let sessionStartAt = updatedBooking.session?.startAt;
          if (!sessionStartAt) {
            const now = new Date();
            const firstSession = await db.courseSession.findFirst({
              where: {
                courseId: booking.courseId,
                startAt: {
                  gte: now,
                },
              },
              orderBy: {
                startAt: "asc",
              },
            });
            sessionStartAt = firstSession?.startAt || new Date();
          }

          const confirmationEmail = await renderEmailTemplate("booking_confirmed", {
            courseTitle: updatedBooking.course.title,
            startAt: sessionStartAt,
            parentName: `${booking.firstName} ${booking.lastName}`,
            bookingId: updatedBooking.id,
            priceCents: updatedBooking.course.priceCents,
          });

          await sendEmail({
            to: booking.email,
            subject: confirmationEmail.subject,
            text: confirmationEmail.text,
            html: confirmationEmail.html,
          });

          console.log(`[Booking] Confirmation email sent to: ${booking.email}`);
        } catch (error: any) {
          console.error("[Booking] Failed to send confirmation email:", error);
          // Fehler beim E-Mail-Versand sollte nicht die Status-Änderung verhindern
        }
      } else {
        console.warn("[Booking] E-Mail nicht konfiguriert, Bestätigungs-E-Mail wird nicht gesendet");
      }
    }

    return NextResponse.json(updatedBooking);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Fehler beim Aktualisieren der Buchung:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

