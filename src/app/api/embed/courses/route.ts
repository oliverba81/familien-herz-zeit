import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getPublishedCoursesSerializable } from "@/lib/courses/published-courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/embed/courses
 * Liefert veröffentlichte Kurse (serialisierbar) für die Live-Vorschau der
 * Embed-Blöcke im WYSIWYG-Builder. Nur für ADMIN/EDITOR.
 */
export async function GET() {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], { throwError: true });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courses = await getPublishedCoursesSerializable();
    return NextResponse.json({ courses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Kurse konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}
