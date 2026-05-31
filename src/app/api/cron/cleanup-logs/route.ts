import { NextRequest, NextResponse } from "next/server";
import { runCleanup } from "@/lib/logging/cleanup";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/cleanup-logs
 * Cron-Job Endpoint zum automatischen Bereinigen alter Logs
 * Sollte täglich aufgerufen werden (z.B. via Vercel Cron, GitHub Actions, etc.)
 * 
 * Security: Sollte mit einem Secret-Token geschützt werden
 * Beispiel: ?token=YOUR_SECRET_TOKEN
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Prüfe Secret-Token für Sicherheit
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (expectedToken && token !== expectedToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await runCleanup();

    await logger.info("SYSTEM", "LOGS_CLEANUP_AUTO", `Automatic log cleanup completed: ${result.deleted} entries deleted`, {
      deletedCount: result.deleted,
    });

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    await logger.error("SYSTEM", "LOGS_CLEANUP_AUTO_ERROR", "Error during automatic log cleanup", error as Error);

    return NextResponse.json(
      { error: "Fehler bei der Bereinigung", details: error.message },
      { status: 500 }
    );
  }
}

