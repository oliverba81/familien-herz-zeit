import { db } from "@/lib/db";
import { generateInvoicePDF, generateInvoiceNumber } from "./generator";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

/**
 * Erstellt eine Rechnung für einen Purchase (ohne Auth, für interne Verwendung)
 */
export async function createInvoiceForPurchase(purchaseId: string): Promise<void> {
  try {
    // Prüfe ob Rechnung bereits existiert
    const purchase = await db.videoPurchase.findUnique({
      where: { id: purchaseId },
      include: {
        videoCourse: true,
        user: true,
        invoice: true,
      },
    });

    if (!purchase || purchase.status !== "PAID" || purchase.invoice) {
      return; // Keine Rechnung nötig oder bereits vorhanden
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
    await db.invoice.create({
      data: {
        invoiceNumber,
        purchaseId: purchase.id,
        userId: purchase.userId,
        pdfUrl,
      },
    });
  } catch (error: any) {
    console.error("Fehler beim Erstellen der Rechnung:", error);
    // Fehler sollte nicht den Webhook/Capture fehlschlagen lassen
  }
}

