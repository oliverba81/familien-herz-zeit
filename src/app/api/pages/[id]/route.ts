import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { pageUpsertSchema } from "@/lib/validations/pages";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";
import { logAudit, getActorFromSession, getChangedFields } from "@/lib/audit/log";
import { AuditAction } from "@prisma/client";
import { revalidateTag } from "@/lib/cache/revalidate";
import { tagPage, tagPages } from "@/lib/seo/tags";
import { parsePageContent, pageContentSchemaV1, isPageContentV2, pageContentSchemaV2, resolveContentKind } from "@/lib/page-builder/schema";
import { createPageRevision } from "@/lib/pages/revisions";

// GET /api/pages/:id - Einzelne Seite abrufen
export async function GET(
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
    const page = await db.page.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json({ error: "Seite nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error fetching page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/pages/:id - Seite aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: any = null;
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Versuche Request-Body zu parsen
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error("❌ Failed to parse request body:", parseError.message);
      return NextResponse.json(
        { 
          error: "Ungültiger Request-Body", 
          message: "Der Request-Body konnte nicht als JSON geparst werden. Möglicherweise ist er leer oder beschädigt.",
          details: parseError.message 
        },
        { status: 400 }
      );
    }
    
    // Log nur in Development und nur einen Ausschnitt
    if (process.env.NODE_ENV === "development") {
      const bodyPreview = {
        title: body.title,
        slug: body.slug,
        published: body.published,
        hasDraftContent: !!body.draftContentJson,
        hasContent: !!body.contentJson,
      };
      console.log("📥 Received body for update:", JSON.stringify(bodyPreview, null, 2));
    }

    // Setze published default auf false falls nicht vorhanden
    if (body.published === undefined) {
      body.published = false;
    }

    // Setze showTitle default auf true falls nicht vorhanden oder null
    if (body.showTitle === undefined || body.showTitle === null) {
      body.showTitle = true;
    }
    
    // Stelle sicher, dass showTitle ein Boolean ist
    body.showTitle = Boolean(body.showTitle);

    // Setze containerWidth default auf "medium" falls nicht vorhanden
    if (!body.containerWidth) {
      body.containerWidth = "medium";
    }

    // Validierung
    const validatedData = pageUpsertSchema.parse(body);

    // Prüfe ob Seite existiert und ob Slug-Änderung nötig ist
    const existingPage = await db.page.findUnique({
      where: { id },
      select: {
        id: true,
        published: true,
        slug: true,
        draftContentJson: true,
        contentJson: true,
      },
    });

    if (!existingPage) {
      return NextResponse.json({ error: "Seite nicht gefunden" }, { status: 404 });
    }

    // Prüfe Slug-Konflikt nur wenn sich der Slug geändert hat
    if (existingPage.slug !== validatedData.slug) {
      const slugConflict = await db.page.findFirst({
        where: {
          slug: validatedData.slug,
          id: { not: id },
        },
        select: { id: true },
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: "Eine andere Seite mit diesem Slug existiert bereits" },
          { status: 409 }
        );
      }
    }

    // Inhalt ist OPTIONAL: Einstellungen können ohne Inhalt aktualisiert werden
    // (Inhalt wird im Visual-Builder separat gespeichert). Nur wenn Inhalt mitkommt,
    // wird er validiert/geschrieben — sonst bleibt der bestehende Inhalt unangetastet.
    const contentProvided =
      (body.draftContentJson !== undefined && body.draftContentJson !== null) ||
      (body.contentJson !== undefined && body.contentJson !== null);
    let draftContentJson = body.draftContentJson ?? body.contentJson;

    if (contentProvided) {
    if (typeof draftContentJson === "string") {
      try {
        draftContentJson = JSON.parse(draftContentJson);
      } catch (e) {
        return NextResponse.json(
          { error: "Ungültiges JSON in draftContentJson" },
          { status: 400 }
        );
      }
    }

    // Validiere Page Content Schema (V1, V2 oder Puck/V3)
    const contentKind = resolveContentKind(draftContentJson);
    if (contentKind === "puck") {
      // P0-b: Puck-Daten (V3) NICHT durch parsePageContent/migrateToV1 schicken — sonst
      // würde die Seite auf LEER überschrieben (Totalverlust). Strukturell bereits durch
      // resolveContentKind garantiert (root-Objekt + content-Array); volle Config-Validierung
      // erfolgt clientseitig im Editor. Nur den version:3-Tag sicherstellen.
      if ((draftContentJson as { version?: number }).version !== 3) {
        draftContentJson = { version: 3, ...(draftContentJson as object) };
      }
    } else if (isPageContentV2(draftContentJson)) {
      try {
        pageContentSchemaV2.parse(draftContentJson);
        // V2: unverändert speichern
      } catch (e: any) {
        if (process.env.NODE_ENV === "development") {
          console.error("V2 Content validation error:", e?.message || e);
        }
        if (e?.name === "ZodError") {
          const issues = e.issues || [];
          const errorMessages = issues
            .map((issue: any) => {
              const path = issue.path?.length ? issue.path.join(".") : "root";
              return `${path}: ${issue.message}`;
            })
            .join(", ");
          return NextResponse.json(
            {
              error: "Ungültiges V2 Content-Format",
              message: errorMessages,
              details: issues,
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Ungültiges V2 Content-Format", message: e?.message },
          { status: 400 }
        );
      }
    } else {
      try {
        const parsedContent = parsePageContent(draftContentJson);
        draftContentJson = parsedContent;
      } catch (e: any) {
      // Log nur in Development
      if (process.env.NODE_ENV === "development") {
        console.error("Content validation error:", e?.message || e);
        if (e?.issues) {
          console.error("Validation issues:", e.issues);
        }
      }
      
      // Wenn es ein ZodError ist, gebe detaillierte Fehler zurück
      if (e?.name === "ZodError") {
        const issues = e.issues || [];
        const errorMessages = issues.map((issue: any) => {
          const path = issue.path && issue.path.length > 0 ? issue.path.join(".") : "root";
          return `${path}: ${issue.message}`;
        }).join(", ");
        
        return NextResponse.json(
          { 
            error: "Ungültiges Content-Format", 
            message: errorMessages || e.message || "Content-Validierung fehlgeschlagen",
            details: issues.length > 0 ? issues : e.message 
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
          {
            error: "Ungültiges Content-Format",
            message: e?.message || "Content-Validierung fehlgeschlagen",
            details: e?.message
          },
          { status: 400 }
        );
      }
    }
    } // Ende if (contentProvided)

    // Aktualisiere Seite
    const updateData: any = {
      title: validatedData.title,
      slug: validatedData.slug,
      published: validatedData.published ?? false,
      showTitle: validatedData.showTitle ?? true,
      containerWidth: validatedData.containerWidth ?? "medium",
      customCss: validatedData.customCss || null,
      metaDescription: validatedData.metaDescription ?? null,
      metaKeywords: validatedData.metaKeywords ?? null,
      ogImageUrl: validatedData.ogImageUrl ?? null,
    };

    // Inhalt nur schreiben, wenn mitgeliefert (sonst reines Einstellungen-Update,
    // der bestehende Inhalt bleibt unangetastet → kein Überschreiben von Puck-Edits).
    if (contentProvided) {
      updateData.draftContentJson = draftContentJson;
      updateData.contentJson = draftContentJson; // Legacy-Spiegel
    }

    // Beim Veröffentlichen den (neuen oder bestehenden) Entwurf nach publishedContentJson promoten.
    const isPublishing = validatedData.published === true;
    if (isPublishing) {
      updateData.publishedContentJson = contentProvided
        ? draftContentJson
        : (existingPage.draftContentJson ?? existingPage.contentJson);
      if (!existingPage.published) {
        updateData.publishedAt = new Date();
      }
    }

    // Log nur in Development
    if (process.env.NODE_ENV === "development") {
      console.log("📝 Updating page:", {
        id,
        title: validatedData.title,
        slug: validatedData.slug,
        published: validatedData.published,
      });
    }
    
    const page = await db.page.update({
      where: { id },
      data: updateData,
    });

    // Versionshistorie: Snapshot nur bei manuellem Speichern mit Inhalt (nicht bei Autosave/Settings-only).
    if (body.createRevision === true && contentProvided) {
      try {
        const actor = await getActorFromSession();
        await createPageRevision(id, draftContentJson, {
          createdById: actor?.userId ?? null,
        });
      } catch (e) {
        console.error("[pages] Snapshot fehlgeschlagen:", e);
      }
    }

    await logger.success("ADMIN", "PAGE_UPDATED", `Page updated: ${page.title}`, {
      pageId: page.id,
      slug: page.slug,
      published: page.published,
    });

    // Cache invalidierten, wenn Seite veröffentlicht ist
    if (page.published === true) {
      revalidateTag(tagPage(page.slug));
      revalidateTag(tagPages());
    }

    return NextResponse.json(page);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    if (error.name === "ZodError") {
      const errorDetails = error.errors || [];
      console.error("Zod validation error:", JSON.stringify(errorDetails, null, 2));
      console.error("Zod error issues:", JSON.stringify(error.issues, null, 2));
      if (body) {
        console.error("Request body:", JSON.stringify(body, null, 2));
      } else {
        console.error("Request body: nicht verfügbar (Fehler beim Parsen)");
      }
      
      // Wenn keine Fehler im errors-Array sind, aber es ein ZodError ist, 
      // könnte es ein refine-Fehler sein - verwende issues stattdessen
      const issues = error.issues || errorDetails;
      const errorMessages = issues.map((e: any) => {
        const path = e.path && e.path.length > 0 ? e.path.join(".") : e.path || "root";
        return `${path}: ${e.message}`;
      }).join(", ");
      
      return NextResponse.json(
        { 
          error: "Validierungsfehler", 
          message: errorMessages || error.message || "Ungültige Daten",
          details: issues.length > 0 ? issues : errorDetails 
        },
        { status: 400 }
      );
    }
    console.error("❌ Error updating page:", error);
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error.message,
        name: error.name,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/pages/:id - Seite löschen
export async function DELETE(
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

    // Prüfe ob Seite existiert
    const existingPage = await db.page.findUnique({
      where: { id },
    });

    if (!existingPage) {
      return NextResponse.json({ error: "Seite nicht gefunden" }, { status: 404 });
    }

    // Lösche Seite
    const pageTitle = existingPage.title;
    const pageSlug = existingPage.slug;
    await db.page.delete({
      where: { id },
    });

    await logger.warning(
      "ADMIN",
      "PAGE_DELETED",
      `Page deleted: ${pageTitle}`,
      undefined,
      undefined,
      {
        pageId: id,
        slug: pageSlug,
      }
    );

    // Audit Log
    const actor = await getActorFromSession();
    await logAudit({
      actor,
      entity: {
        type: "Page",
        id: existingPage.id,
        label: existingPage.slug,
      },
      action: AuditAction.DELETE,
      message: `Seite "${pageTitle}" gelöscht`,
    });

    // Revalidate Cache
    revalidateTag(tagPage(existingPage.slug));
    revalidateTag(tagPages());

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error deleting page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

