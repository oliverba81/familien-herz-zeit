import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/invoice/generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/invoices/test
 * Generiert eine Testrechnung als PDF
 */
export async function GET(request: NextRequest) {
  try {
    let session;
    try {
      session = await requireRole(["ADMIN", "EDITOR"], {
        throwError: true,
      });
    } catch (authError: any) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Unauthorized", details: authError.message },
        { status: 401 }
      );
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lade Rechnungseinstellungen
    let settings = await db.invoiceSettings.findFirst();

    if (!settings) {
      // Erstelle Standard-Einstellungen
      settings = await db.invoiceSettings.create({
        data: {
          companyName: "Familien Herz Zeit",
          companyAddress: "",
          companyCity: "",
          companyZip: "",
          companyCountry: "Deutschland",
          taxRate: 19.0,
          invoiceNumberPrefix: "RE",
          invoiceNumberSuffix: null,
          invoiceNumberStart: 1,
          isSmallBusiness: false,
        },
      });
    }

    // Generiere Test-Rechnungsnummer basierend auf den Einstellungen (ohne Jahr, ohne TEST-Präfix)
    const prefix = settings.invoiceNumberPrefix || "RE";
    const suffix = settings.invoiceNumberSuffix || "";
    const startNumber = settings.invoiceNumberStart || 1;
    
    // Für Testrechnungen verwenden wir immer die Startnummer
    const number = String(startNumber).padStart(4, "0");
    
    // Baue die Rechnungsnummer zusammen (ohne Bindestriche, ohne Jahr)
    let invoiceNumber = prefix ? `${prefix}${number}` : number;
    if (suffix) {
      invoiceNumber = `${invoiceNumber}${suffix}`;
    }

    // Erstelle Test-Daten
    const testData = {
      invoiceNumber,
      purchase: {
        id: "test-purchase-id",
        amountCents: 9900, // 99,00 EUR
        currency: "eur",
        paidAt: new Date(),
        email: "max.mustermann@example.com",
        videoCourse: {
          title: "Test Videokurs - Beispiel",
        },
        user: {
          firstName: "Max",
          lastName: "Mustermann",
          email: "max.mustermann@example.com",
          address: "Musterstraße 123",
          city: "Musterstadt",
          zip: "12345",
          country: "Deutschland",
        },
      },
      settings: {
        companyName: settings.companyName,
        companyAddress: settings.companyAddress,
        companyCity: settings.companyCity,
        companyZip: settings.companyZip,
        companyCountry: settings.companyCountry,
        companyTaxId: settings.companyTaxId,
        companyVatId: settings.companyVatId,
        taxRate: settings.taxRate,
        isSmallBusiness: settings.isSmallBusiness,
      },
    };

    // Validiere Test-Daten
    if (!testData.settings.companyName) {
      throw new Error("Firmenname fehlt in Rechnungseinstellungen");
    }

    // Generiere PDF
    console.log("Starte PDF-Generierung mit Test-Daten:", {
      invoiceNumber: testData.invoiceNumber,
      companyName: testData.settings.companyName,
      amountCents: testData.purchase.amountCents,
    });

    const pdfBuffer = await generateInvoicePDF(testData);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("PDF-Buffer ist leer");
    }

    console.log("PDF erfolgreich generiert, Größe:", pdfBuffer.length, "bytes");

    // Return PDF als Response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="test-rechnung-${invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Fehler beim Generieren der Testrechnung:", error);
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);
    return NextResponse.json(
      { 
        error: "Interner Serverfehler",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

