import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInvoicePDF, generateInvoiceNumber } from "@/lib/invoice/generator";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const generateInvoiceSchema = z.object({
  purchaseId: z.string().min(1),
});

/**
 * POST /api/invoice/generate
 * Erstellt eine Rechnung für einen Purchase
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Nicht angemeldet" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = generateInvoiceSchema.parse(body);

    // Lade Purchase
    const purchase = await db.videoPurchase.findUnique({
      where: { id: validatedData.purchaseId },
      include: {
        videoCourse: true,
        user: true,
        invoice: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Kauf nicht gefunden" },
        { status: 404 }
      );
    }

    if (purchase.status !== "PAID") {
      return NextResponse.json(
        { error: "Kauf ist noch nicht bezahlt" },
        { status: 400 }
      );
    }

    // Prüfe ob User berechtigt ist (Admin/Editor oder eigener Purchase)
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User nicht gefunden" },
        { status: 404 }
      );
    }

    if (
      user.role !== "ADMIN" &&
      user.role !== "EDITOR" &&
      purchase.userId !== user.id
    ) {
      return NextResponse.json(
        { error: "Nicht berechtigt" },
        { status: 403 }
      );
    }

    // Prüfe ob Rechnung bereits existiert
    if (purchase.invoice) {
      return NextResponse.json({
        invoiceId: purchase.invoice.id,
        pdfUrl: purchase.invoice.pdfUrl,
        message: "Rechnung bereits vorhanden",
      });
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

    // Generiere Rechnungsnummer
    const invoiceNumber = await generateInvoiceNumber();

    // Generiere PDF
    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber,
      purchase: {
        id: purchase.id,
        amountCents: purchase.amountCents,
        currency: purchase.currency,
        paidAt: purchase.paidAt!,
        email: purchase.email,
        videoCourse: {
          title: purchase.videoCourse.title,
        },
        user: purchase.user
          ? {
              firstName: purchase.user.firstName,
              lastName: purchase.user.lastName,
              email: purchase.email,
              address: purchase.user.address,
              city: purchase.user.city,
              zip: purchase.user.zip,
              country: purchase.user.country,
            }
          : null,
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
    });

    // Speichere PDF
    const uploadsDir = join(process.cwd(), "public", "invoices");
    await mkdir(uploadsDir, { recursive: true });

    const fileName = `${invoiceNumber}.pdf`;
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, pdfBuffer);

    const pdfUrl = `/invoices/${fileName}`;

    // Erstelle Invoice in DB
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        purchaseId: purchase.id,
        userId: purchase.userId,
        pdfUrl,
      },
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      pdfUrl: invoice.pdfUrl,
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Fehler beim Generieren der Rechnung:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

