import PDFDocument from "pdfkit";
import { formatCents } from "@/lib/utils/money";
import { join } from "path";
import { readFileSync } from "fs";

interface InvoiceData {
  invoiceNumber: string;
  purchase: {
    id: string;
    amountCents: number;
    currency: string;
    paidAt: Date;
    email: string; // Email des Käufers (wird verwendet wenn user null ist)
    videoCourse: {
      title: string;
    };
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
      address: string | null;
      city: string | null;
      zip: string | null;
      country: string | null;
    } | null;
  };
  settings: {
    companyName: string;
    companyAddress: string;
    companyCity: string;
    companyZip: string;
    companyCountry: string;
    companyTaxId: string | null;
    companyVatId: string | null;
    taxRate: number;
    isSmallBusiness: boolean; // Kleinunternehmerregelung nach § 19 UStG
  };
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Setze den Font-Pfad für PDFKit explizit
      // PDFKit sucht die Fonts in node_modules/pdfkit/js/data
      // In Next.js muss der Pfad zur Laufzeit verfügbar sein
      const fontDataPath = join(process.cwd(), "node_modules", "pdfkit", "js", "data");
      
      // Stelle sicher, dass der Font-Pfad verfügbar ist
      try {
        readFileSync(join(fontDataPath, "Helvetica.afm"));
      } catch (error) {
        console.warn("PDFKit Font-Pfad nicht gefunden, verwende Standard-Pfad:", fontDataPath);
      }

      // Erstelle PDFDocument - PDFKit sollte die Fonts automatisch finden
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on("error", reject);

      // Header
      doc.fontSize(20).text(data.settings.companyName, { align: "right" });
      doc.fontSize(10).text(data.settings.companyAddress, { align: "right" });
      doc.text(
        `${data.settings.companyZip} ${data.settings.companyCity}`,
        { align: "right" }
      );
      doc.text(data.settings.companyCountry, { align: "right" });
      if (data.settings.companyTaxId) {
        doc.text(`Steuernummer: ${data.settings.companyTaxId}`, {
          align: "right",
        });
      }
      if (data.settings.companyVatId) {
        doc.text(`USt-IdNr.: ${data.settings.companyVatId}`, { align: "right" });
      }

      doc.moveDown(2);

      // Rechnungsnummer und Datum
      doc.fontSize(16).text("Rechnung", { align: "left" });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Rechnungsnummer: ${data.invoiceNumber}`);
      doc.text(
        `Rechnungsdatum: ${new Date(data.purchase.paidAt).toLocaleDateString("de-DE")}`
      );
      doc.text(
        `Leistungsdatum: ${new Date(data.purchase.paidAt).toLocaleDateString("de-DE")}`
      );
      doc.text(
        `Zahlungsdatum: ${new Date(data.purchase.paidAt).toLocaleDateString("de-DE")}`
      );

      doc.moveDown(2);

      // Rechnungsempfänger
      if (data.purchase.user) {
        doc.fontSize(12).text("Rechnungsempfänger:", { underline: true });
        doc.fontSize(10);
        if (data.purchase.user.firstName && data.purchase.user.lastName) {
          doc.text(
            `${data.purchase.user.firstName} ${data.purchase.user.lastName}`
          );
        }
        doc.text(data.purchase.user.email);
        if (data.purchase.user.address) {
          doc.text(data.purchase.user.address);
        }
        if (data.purchase.user.zip && data.purchase.user.city) {
          doc.text(`${data.purchase.user.zip} ${data.purchase.user.city}`);
        }
        if (data.purchase.user.country) {
          doc.text(data.purchase.user.country);
        }
      } else {
        doc.fontSize(12).text("Rechnungsempfänger:", { underline: true });
        doc.fontSize(10).text(data.purchase.email);
      }

      doc.moveDown(2);

      // Positionen
      doc.fontSize(12).text("Positionen:", { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const itemHeight = 30;

      // Tabellenkopf
      doc.fontSize(10);
      doc.text("Beschreibung", 50, tableTop);
      doc.text("Menge", 350, tableTop);
      doc.text("Einzelpreis", 400, tableTop, { width: 80, align: "right" });
      doc.text("Gesamtpreis", 480, tableTop, { width: 70, align: "right" });

      // Position
      const yPos = tableTop + itemHeight;
      doc.text(data.purchase.videoCourse.title, 50, yPos);
      doc.text("1", 350, yPos);
      doc.text(formatCents(data.purchase.amountCents), 400, yPos, {
        width: 80,
        align: "right",
      });
      doc.text(formatCents(data.purchase.amountCents), 480, yPos, {
        width: 70,
        align: "right",
      });

      // Berechnungen
      const summaryY = yPos + itemHeight + 20;
      
      if (data.settings.isSmallBusiness) {
        // Kleinunternehmerregelung: MwSt = 0%
        // Bei Kleinunternehmerregelung ist der Betrag bereits netto (keine MwSt enthalten)
        const netAmount = data.purchase.amountCents;
        const taxAmount = 0; // MwSt = 0% bei Kleinunternehmerregelung
        
        doc.text("Nettobetrag:", 350, summaryY, { width: 100, align: "right" });
        doc.text(formatCents(netAmount), 480, summaryY, {
          width: 70,
          align: "right",
        });

        doc.text(
          "MwSt. (0%):",
          350,
          summaryY + 20,
          { width: 100, align: "right" }
        );
        doc.text(formatCents(taxAmount), 480, summaryY + 20, {
          width: 70,
          align: "right",
        });

        doc.fontSize(12).font("Helvetica-Bold");
        doc.text("Gesamtbetrag:", 350, summaryY + 50, { width: 100, align: "right" });
        doc.text(formatCents(data.purchase.amountCents), 480, summaryY + 50, {
          width: 70,
          align: "right",
        });
        
        doc.fontSize(10).font("Helvetica");
        doc.moveDown(2);
        
        // Hinweis auf Kleinunternehmerregelung direkt unter der Tabelle
        doc.fontSize(9);
        // Verwende die linke Margin (50) als X-Position
        const margin = 50;
        // Standard PDF-Seitenbreite ist 612 Punkte (US Letter)
        const pageWidth = 612;
        const textWidth = pageWidth - (2 * margin); // 512 Punkte verfügbar
        
        // Klarer und deutlicher Hinweis gemäß den Anforderungen
        const startY = doc.y;
        // Erste Zeile
        doc.text("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.", margin, startY, {
          width: textWidth,
          align: "left",
        });
        
        // Zweite Zeile mit etwas Abstand (ca. 12 Punkte)
        const secondY = startY + 12;
        doc.text("Im ausgewiesenen Betrag ist gemäß § 19 Absatz 1 UStG keine Umsatzsteuer enthalten.", margin, secondY, {
          width: textWidth,
          align: "left",
        });
        
        // Setze die Y-Position für den nächsten Text
        doc.y = secondY + 15;
        doc.moveDown(1);
      } else {
        // Normale Rechnung mit MwSt
        const netAmount = data.purchase.amountCents / (1 + data.settings.taxRate / 100);
        const taxAmount = data.purchase.amountCents - netAmount;

        doc.text("Nettobetrag:", 350, summaryY, { width: 100, align: "right" });
        doc.text(formatCents(Math.round(netAmount)), 480, summaryY, {
          width: 70,
          align: "right",
        });

        doc.text(
          `MwSt. (${data.settings.taxRate}%):`,
          350,
          summaryY + 20,
          { width: 100, align: "right" }
        );
        doc.text(formatCents(Math.round(taxAmount)), 480, summaryY + 20, {
          width: 70,
          align: "right",
        });

        doc.fontSize(12).font("Helvetica-Bold");
        doc.text("Gesamtbetrag:", 350, summaryY + 50, { width: 100, align: "right" });
        doc.text(formatCents(data.purchase.amountCents), 480, summaryY + 50, {
          width: 70,
          align: "right",
        });
      }

      doc.fontSize(10).font("Helvetica");
      doc.moveDown(3);

      // Fußzeile
      doc.text("Vielen Dank für deinen Einkauf!", { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateInvoiceNumber(): Promise<string> {
  const { db } = await import("@/lib/db");
  
  // Lade Rechnungseinstellungen
  const settings = await db.invoiceSettings.findFirst();
  
  const year = new Date().getFullYear();
  const prefix = settings?.invoiceNumberPrefix || "RE";
  const suffix = settings?.invoiceNumberSuffix || "";
  const startNumber = settings?.invoiceNumberStart || 1;
  
  // Baue das Suchmuster für bestehende Rechnungen
  // Suche nach Rechnungen, die mit Prefix-Jahr beginnen (Suffix wird ignoriert beim Zählen)
  const searchPattern = prefix ? `${prefix}${year}` : `${year}`;
  
  // Zähle bestehende Rechnungen für das aktuelle Jahr mit dem gleichen Prefix
  const count = await db.invoice.count({
    where: {
      invoiceNumber: {
        startsWith: searchPattern,
      },
    },
  });
  
  // Berechne die nächste Nummer basierend auf Startnummer und Anzahl
  const nextNumber = startNumber + count;
  const number = String(nextNumber).padStart(4, "0");
  
  // Baue die Rechnungsnummer zusammen (ohne Bindestriche)
  let invoiceNumber = prefix ? `${prefix}${year}${number}` : `${year}${number}`;
  if (suffix) {
    invoiceNumber = `${invoiceNumber}${suffix}`;
  }
  
  return invoiceNumber;
}

