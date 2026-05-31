import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailTemplateTypes = [
  "booking_user",
  "booking_confirmed",
  "booking_admin",
  "video_access",
  "contact_admin",
  "contact_user_confirm",
] as const;

const emailTemplateTypeSchema = z.enum(emailTemplateTypes);

const updateTemplateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  description: z.string().optional(),
  subject: z.string().min(1, "Betreff ist erforderlich"),
  textBody: z.string().min(1, "Text-Version ist erforderlich"),
  htmlBody: z.string().min(1, "HTML-Version ist erforderlich"),
});

/**
 * GET /api/admin/email-templates
 * Gibt alle E-Mail-Templates zurück
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let templates: any[] = [];
    try {
      templates = await db.emailTemplate.findMany({
        orderBy: { type: "asc" },
      });
    } catch (dbError: any) {
      // Tabelle existiert möglicherweise noch nicht - verwende nur Standard-Templates
      console.warn("[EmailTemplates] Tabelle EmailTemplate existiert noch nicht:", dbError.message);
    }

    // Erstelle ein Objekt mit allen Template-Typen, auch wenn sie nicht in der DB sind
    const templatesMap: Record<string, any> = {};
    
    // Lade Standard-Templates für fehlende Typen
    const { getDefaultTemplates } = await import("@/lib/email/templates/defaults");
    const defaultTemplates = getDefaultTemplates();

    emailTemplateTypes.forEach((type) => {
      const dbTemplate = templates.find((t) => t.type === type);
      if (dbTemplate) {
        templatesMap[type] = dbTemplate;
      } else {
        // Verwende Standard-Template
        templatesMap[type] = {
          id: null,
          type,
          ...defaultTemplates[type],
          createdAt: null,
          updatedAt: null,
        };
      }
    });

    return NextResponse.json({
      templates: Object.values(templatesMap),
      availableTypes: emailTemplateTypes,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Laden der E-Mail-Templates:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/email-templates
 * Aktualisiert oder erstellt ein E-Mail-Template
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
    const { type, ...templateData } = body;

    // Validierung
    const validatedType = emailTemplateTypeSchema.parse(type);
    const validatedData = updateTemplateSchema.parse(templateData);

    // Prüfe ob Template existiert
    let existing;
    try {
      existing = await db.emailTemplate.findUnique({
        where: { type: validatedType },
      });
    } catch (dbError: any) {
      // Tabelle existiert möglicherweise noch nicht
      console.error("[EmailTemplates] Fehler beim Zugriff auf EmailTemplate:", dbError);
      return NextResponse.json(
        { error: "E-Mail-Template-Tabelle existiert noch nicht. Bitte Migration ausführen." },
        { status: 503 }
      );
    }

    if (existing) {
      // Update
      const updated = await db.emailTemplate.update({
        where: { type: validatedType },
        data: {
          name: validatedData.name,
          description: validatedData.description || null,
          subject: validatedData.subject,
          textBody: validatedData.textBody,
          htmlBody: validatedData.htmlBody,
        },
      });
      return NextResponse.json(updated);
    } else {
      // Create
      const created = await db.emailTemplate.create({
        data: {
          type: validatedType,
          name: validatedData.name,
          description: validatedData.description || null,
          subject: validatedData.subject,
          textBody: validatedData.textBody,
          htmlBody: validatedData.htmlBody,
        },
      });
      return NextResponse.json(created);
    }
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
    console.error("Fehler beim Speichern des E-Mail-Templates:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

