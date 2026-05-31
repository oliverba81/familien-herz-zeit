import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { runCleanup } from "@/lib/logging/cleanup";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/logs/cleanup
 * Führt manuelle Bereinigung alter Logs durch (nur für Admins)
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN"], { throwError: true });

    const result = await runCleanup();

    await logger.info("SYSTEM", "LOGS_CLEANUP", result.message, {
      deletedCount: result.deleted,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }

    await logger.error("SYSTEM", "LOGS_CLEANUP_ERROR", "Error during log cleanup", error as Error);

    return NextResponse.json(
      { error: "Fehler bei der Bereinigung", details: error.message },
      { status: 500 }
    );
  }
}

