import { db } from "@/lib/db";
import { LogLevel, LogCategory } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";

interface LogOptions {
  level: LogLevel;
  category: LogCategory;
  action: string;
  message: string;
  details?: any;
  userId?: string;
  metadata?: Record<string, any>;
  error?: Error;
  requestPath?: string;
  requestMethod?: string;
}

/**
 * Hauptfunktion zum Erstellen von Log-Einträgen
 */
export async function logEvent(options: LogOptions): Promise<void> {
  try {
    // Hole Session für userId (falls nicht explizit angegeben)
    let userId: string | undefined = options.userId;
    if (!userId) {
      try {
        const session = await getServerSession(authOptions);
        userId = session?.user?.id || undefined;
      } catch (error) {
        // Session kann in manchen Kontexten nicht verfügbar sein (z.B. Webhooks)
        userId = undefined;
      }
    }

    // Hole Request-Info (falls verfügbar)
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    let requestPath: string | null = options.requestPath || null;
    let requestMethod: string | null = options.requestMethod || null;

    try {
      const headersList = await headers();
      ipAddress = headersList.get("x-forwarded-for") || 
                  headersList.get("x-real-ip") || 
                  null;
      userAgent = headersList.get("user-agent") || null;
      
      // Nur überschreiben wenn nicht explizit angegeben
      if (!requestPath) {
        requestPath = headersList.get("x-pathname") || null;
      }
      if (!requestMethod) {
        requestMethod = headersList.get("x-method") || null;
      }
    } catch (error) {
      // Headers können in manchen Kontexten nicht verfügbar sein
    }

    // Bereite Details und Metadata vor (sicher JSON-serialisieren)
    let detailsJson = null;
    if (options.details !== undefined) {
      try {
        detailsJson = JSON.parse(JSON.stringify(options.details));
      } catch (error) {
        detailsJson = { error: "Failed to serialize details" };
      }
    }

    let metadataJson = null;
    if (options.metadata !== undefined) {
      try {
        metadataJson = JSON.parse(JSON.stringify(options.metadata));
      } catch (error) {
        metadataJson = { error: "Failed to serialize metadata" };
      }
    }

    // Erstelle Log-Eintrag
    await db.systemLog.create({
      data: {
        level: options.level,
        category: options.category,
        action: options.action,
        message: options.message,
        details: detailsJson,
        userId: userId || undefined,
        ipAddress,
        userAgent,
        requestPath,
        requestMethod: requestMethod as any,
        errorStack: options.error?.stack || null,
        metadata: metadataJson,
      },
    });
  } catch (error) {
    // Fallback: Console-Log wenn DB-Logging fehlschlägt
    console.error("[Logger] Failed to write log:", error);
    console.error("[Logger] Original log:", {
      level: options.level,
      category: options.category,
      action: options.action,
      message: options.message,
    });
  }
}

/**
 * Convenience-Funktionen für verschiedene Log-Level
 */
export const logger = {
  info: async (
    category: LogCategory,
    action: string,
    message: string,
    details?: any,
    metadata?: Record<string, any>
  ) => {
    await logEvent({
      level: "INFO",
      category,
      action,
      message,
      details,
      metadata,
    });
  },

  success: async (
    category: LogCategory,
    action: string,
    message: string,
    details?: any,
    metadata?: Record<string, any>
  ) => {
    await logEvent({
      level: "SUCCESS",
      category,
      action,
      message,
      details,
      metadata,
    });
  },

  warning: async (
    category: LogCategory,
    action: string,
    message: string,
    details?: any,
    error?: Error,
    metadata?: Record<string, any>
  ) => {
    await logEvent({
      level: "WARNING",
      category,
      action,
      message,
      details,
      error,
      metadata,
    });
  },

  error: async (
    category: LogCategory,
    action: string,
    message: string,
    error?: Error,
    details?: any,
    metadata?: Record<string, any>
  ) => {
    await logEvent({
      level: "ERROR",
      category,
      action,
      message,
      details,
      error,
      metadata,
    });
  },
};

