import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { restorePageRevision } from "@/lib/pages/revisions";

export const dynamic = "force-dynamic";

/** POST /api/pages/:id/revisions/:revisionId/restore — Version in den Entwurf zurückholen. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], { throwError: true });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, revisionId } = await params;
    const content = await restorePageRevision(id, revisionId);
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    const message = (error as Error)?.message;
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json(
        { error: message },
        { status: message === "Unauthorized" ? 401 : 403 }
      );
    }
    if (message === "Version nicht gefunden") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Error restoring revision:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
