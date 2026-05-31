import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const invoiceSettingsSchema = z.object({
  id: z.string(),
  companyName: z.string().min(1),
  companyAddress: z.string().min(1),
  companyCity: z.string().min(1),
  companyZip: z.string().min(1),
  companyCountry: z.string().min(1),
  companyTaxId: z.string().nullable().optional(),
  companyVatId: z.string().nullable().optional(),
  taxRate: z.number().min(0).max(100),
  invoiceNumberPrefix: z.string().nullable().optional(),
  invoiceNumberSuffix: z.string().nullable().optional(),
  invoiceNumberStart: z.number().int().min(1).optional(),
  isSmallBusiness: z.boolean().optional(),
});

/**
 * PUT /api/admin/invoice-settings
 * Aktualisiert Rechnungseinstellungen
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Ungültiges JSON-Format" },
        { status: 400 }
      );
    }

    // Konvertiere leere Strings zu null für optionale Felder vor der Validierung
    if (body.invoiceNumberPrefix === "") body.invoiceNumberPrefix = null;
    if (body.invoiceNumberSuffix === "") body.invoiceNumberSuffix = null;
    if (body.companyTaxId === "") body.companyTaxId = null;
    if (body.companyVatId === "") body.companyVatId = null;

    const validatedData = invoiceSettingsSchema.parse(body);

    // Prüfe ob Settings existiert
    const existing = await db.invoiceSettings.findUnique({
      where: { id: validatedData.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Rechnungseinstellungen nicht gefunden" },
        { status: 404 }
      );
    }

    // Konvertiere leere Strings zu null für optionale Felder
    const invoiceNumberPrefix = validatedData.invoiceNumberPrefix?.trim() || null;
    const invoiceNumberSuffix = validatedData.invoiceNumberSuffix?.trim() || null;
    // Verwende den Wert aus der Validierung oder den bestehenden Wert oder 1 als Fallback
    const invoiceNumberStart = validatedData.invoiceNumberStart ?? existing.invoiceNumberStart ?? 1;

    const settings = await db.invoiceSettings.update({
      where: { id: validatedData.id },
      data: {
        companyName: validatedData.companyName,
        companyAddress: validatedData.companyAddress,
        companyCity: validatedData.companyCity,
        companyZip: validatedData.companyZip,
        companyCountry: validatedData.companyCountry,
        companyTaxId: validatedData.companyTaxId?.trim() || null,
        companyVatId: validatedData.companyVatId?.trim() || null,
        taxRate: validatedData.taxRate,
        invoiceNumberPrefix,
        invoiceNumberSuffix,
        invoiceNumberStart,
        isSmallBusiness: validatedData.isSmallBusiness ?? false,
      },
    });

    return NextResponse.json(settings);
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
    console.error("Fehler beim Aktualisieren der Rechnungseinstellungen:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

