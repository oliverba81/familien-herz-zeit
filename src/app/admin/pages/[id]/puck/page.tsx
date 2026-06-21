import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import PuckBuilderClient from "@/components/page-builder/puck-builder-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Visual-Builder (Puck) für eine Seite — Phase-3-Integration.
 *
 * Lädt die Seite, übergibt den bestehenden Inhalt (V1/V2/Puck) an den Client-Editor,
 * der ihn nicht-destruktiv nach Puck konvertiert. Speichern/Veröffentlichen über die
 * vorhandenen API-Routen.
 */
export default async function PuckBuilderPage({ params }: PageProps) {
  const session = await requireRole(["ADMIN", "EDITOR"]);
  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) {
    notFound();
  }

  const initialContent = page.draftContentJson ?? page.contentJson;

  return (
    <PuckBuilderClient
      pageId={page.id}
      initialContent={initialContent}
      pageFields={{
        title: page.title,
        slug: page.slug,
        published: page.published,
        showTitle: page.showTitle !== false,
        containerWidth: page.containerWidth ?? "medium",
        customCss: page.customCss ?? null,
        metaDescription: page.metaDescription ?? null,
        metaKeywords: page.metaKeywords ?? null,
        ogImageUrl: page.ogImageUrl ?? null,
      }}
    />
  );
}
