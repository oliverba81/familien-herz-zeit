import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { grantVideoAccess } from "@/lib/video/grant-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/video-purchases/[id]/confirm
 * Bestätigt den Zahlungseingang einer Überweisung und schaltet den Zugang frei.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN"], { throwError: true });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const purchase = await db.videoPurchase.findUnique({ where: { id } });
    if (!purchase) {
      return NextResponse.json({ error: "Kauf nicht gefunden" }, { status: 404 });
    }
    if (purchase.provider !== "BANKTRANSFER") {
      return NextResponse.json(
        { error: "Nur Überweisungs-Käufe können hier bestätigt werden" },
        { status: 400 }
      );
    }

    const result = await grantVideoAccess(id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Zugang konnte nicht freigeschaltet werden" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mailSent: result.mailSent,
      alreadyGranted: result.alreadyGranted ?? false,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Bestätigen der Überweisung:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
