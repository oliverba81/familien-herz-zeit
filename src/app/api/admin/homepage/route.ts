import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { HOMEPAGE_CACHE_TAG } from "@/lib/cache/prisma-cache";
import { tagPages } from "@/lib/seo/tags";

/**
 * POST /api/admin/homepage
 * Setzt die Startseite (Body: { slug: string }).
 * Nur veröffentlichte Seiten werden unter / angezeigt; bei Entwurf bleibt Fallback.
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "EDITOR"], { throwError: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 }
    );
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : null;
  if (!slug) {
    return NextResponse.json(
      { error: "Bitte einen gültigen Slug angeben." },
      { status: 400 }
    );
  }

  const page = await db.page.findUnique({
    where: { slug },
    select: { id: true, title: true, published: true },
  });

  if (!page) {
    return NextResponse.json(
      { error: "Seite mit diesem Slug existiert nicht." },
      { status: 404 }
    );
  }

  await db.siteSettings.upsert({
    where: { key: "homepage_slug" },
    create: { key: "homepage_slug", value: slug },
    update: { value: slug },
  });

  revalidateTag(HOMEPAGE_CACHE_TAG, "max");
  revalidateTag(tagPages(), "max");

  return NextResponse.json({
    ok: true,
    slug,
    title: page.title,
    published: page.published,
  });
}
