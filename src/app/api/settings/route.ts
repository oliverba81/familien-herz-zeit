import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/settings
 * Gibt alle Settings zurück (public für Frontend)
 */
export async function GET() {
  try {
    const settings = await db.siteSettings.findMany();
    
    // Konvertiere zu Key-Value Objekt
    const settingsObj: Record<string, string | null> = {};
    settings.forEach((setting) => {
      settingsObj[setting.key] = setting.value;
    });

    return NextResponse.json(settingsObj);
  } catch (error: any) {
    console.error("Fehler beim Abrufen der Settings:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Aktualisiert Settings (auth required)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Ungültige Settings-Daten" },
        { status: 400 }
      );
    }

    // Update oder erstelle Settings
    const updates = Object.entries(settings).map(([key, value]) =>
      db.siteSettings.upsert({
        where: { key },
        update: { value: value as string | null },
        create: { key, value: value as string | null },
      })
    );

    await Promise.all(updates);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Aktualisieren der Settings:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

