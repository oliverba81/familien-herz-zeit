import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Eingabe-Schema. Secrets sind optional – wird ein Secret-Feld weggelassen oder
 * leer übermittelt, bleibt der gespeicherte Wert erhalten.
 */
const paymentSettingsSchema = z.object({
  stripeEnabled: z.boolean().optional(),
  stripeSecretKey: z.string().optional(),
  stripePublishableKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),

  paypalEnabled: z.boolean().optional(),
  paypalClientId: z.string().optional(),
  paypalClientSecret: z.string().optional(),
  paypalMode: z.enum(["sandbox", "live"]).optional(),

  bankTransferEnabled: z.boolean().optional(),
  bankAccountHolder: z.string().optional(),
  bankIban: z.string().optional(),
  bankBic: z.string().optional(),
  bankName: z.string().optional(),
  bankTransferInfo: z.string().optional(),
});

/** Liefert den (einzigen) Datensatz oder null. */
async function getRow() {
  return db.paymentSettings.findFirst();
}

/**
 * GET /api/admin/payment-settings
 * Gibt die aktuelle Konfiguration zurück – OHNE Secrets, nur "ist gesetzt"-Flags.
 */
export async function GET() {
  try {
    const session = await requireRole(["ADMIN"], { throwError: true });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const row = await getRow();

    return NextResponse.json({
      stripeEnabled: row?.stripeEnabled ?? false,
      stripePublishableKey: row?.stripePublishableKey ?? "",
      hasStripeSecretKey: !!row?.stripeSecretKey,
      hasStripeWebhookSecret: !!row?.stripeWebhookSecret,

      paypalEnabled: row?.paypalEnabled ?? false,
      paypalClientId: row?.paypalClientId ?? "",
      hasPaypalClientSecret: !!row?.paypalClientSecret,
      paypalMode: (row?.paypalMode as "sandbox" | "live") ?? "sandbox",

      bankTransferEnabled: row?.bankTransferEnabled ?? false,
      bankAccountHolder: row?.bankAccountHolder ?? "",
      bankIban: row?.bankIban ?? "",
      bankBic: row?.bankBic ?? "",
      bankName: row?.bankName ?? "",
      bankTransferInfo: row?.bankTransferInfo ?? "",
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Laden der Zahlungseinstellungen:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

/** Normalisiert optionale Strings: trim, leer -> null. */
function norm(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined; // Feld nicht übermittelt -> nicht ändern
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/**
 * PUT /api/admin/payment-settings
 * Aktualisiert die Konfiguration. Secret-Felder werden nur überschrieben, wenn
 * ein nicht-leerer Wert übermittelt wird.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN"], { throwError: true });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiges JSON-Format" }, { status: 400 });
    }

    const data = paymentSettingsSchema.parse(body);

    const existing = await getRow();

    // Secrets: nur setzen, wenn ein nicht-leerer Wert kommt; sonst bestehenden behalten.
    const secretUpdate = (incoming: string | undefined): string | null | undefined => {
      if (incoming === undefined) return undefined; // nicht ändern
      const t = incoming.trim();
      return t.length > 0 ? t : undefined; // leer -> bestehenden Wert behalten
    };

    const updateData = {
      stripeEnabled: data.stripeEnabled,
      stripePublishableKey: norm(data.stripePublishableKey),
      stripeSecretKey: secretUpdate(data.stripeSecretKey),
      stripeWebhookSecret: secretUpdate(data.stripeWebhookSecret),

      paypalEnabled: data.paypalEnabled,
      paypalClientId: norm(data.paypalClientId),
      paypalClientSecret: secretUpdate(data.paypalClientSecret),
      paypalMode: data.paypalMode,

      bankTransferEnabled: data.bankTransferEnabled,
      bankAccountHolder: norm(data.bankAccountHolder),
      bankIban: norm(data.bankIban),
      bankBic: norm(data.bankBic),
      bankName: norm(data.bankName),
      bankTransferInfo: norm(data.bankTransferInfo),
    };

    // undefined-Felder entfernen, damit Prisma sie nicht überschreibt
    Object.keys(updateData).forEach((k) => {
      if ((updateData as Record<string, unknown>)[k] === undefined) {
        delete (updateData as Record<string, unknown>)[k];
      }
    });

    if (existing) {
      await db.paymentSettings.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      await db.paymentSettings.create({ data: updateData });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Speichern der Zahlungseinstellungen:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
