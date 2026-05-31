import { db } from "@/lib/db";

/**
 * Löscht Log-Einträge, die älter als 30 Tage sind
 * Sollte regelmäßig ausgeführt werden (z.B. via Cron-Job oder Scheduled Task)
 */
export async function cleanupOldLogs(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await db.systemLog.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
    },
  });

  return result.count;
}

/**
 * API-Route zum manuellen Ausführen der Bereinigung (nur für Admins)
 * Kann auch als Cron-Job aufgerufen werden
 */
export async function runCleanup(): Promise<{ deleted: number; message: string }> {
  try {
    const deleted = await cleanupOldLogs();
    return {
      deleted,
      message: `Bereinigung abgeschlossen: ${deleted} Log-Einträge gelöscht`,
    };
  } catch (error: any) {
    throw new Error(`Fehler bei der Log-Bereinigung: ${error.message}`);
  }
}

