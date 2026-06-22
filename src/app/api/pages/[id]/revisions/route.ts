import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { listPageRevisions } from "@/lib/pages/revisions";

export const dynamic = "force-dynamic";

/** GET /api/pages/:id/revisions — Versionsliste (neueste zuerst). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], { throwError: true });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const revisions = await listPageRevisions(id);
    return NextResponse.json({ revisions });
  } catch (error) {
    const message = (error as Error)?.message;
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json(
        { error: message },
        { status: message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error listing revisions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
