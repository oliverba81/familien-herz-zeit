import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface AuditActor {
  userId?: string;
  email?: string;
}

export interface AuditEntity {
  type: string; // z.B. "Page", "Course", "Booking", etc.
  id?: string;
  label?: string; // z.B. Page.slug oder Course.title
}

export interface AuditLogParams {
  actor?: AuditActor;
  entity: AuditEntity;
  action: AuditAction;
  message?: string;
  meta?: Record<string, any>;
}

/**
 * Erstellt einen Audit-Log-Eintrag
 * Server-only Funktion
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    // Hole Actor aus Session, falls nicht übergeben
    let actor = params.actor;
    if (!actor) {
      actor = await getActorFromSession();
    }

    // Erstelle Audit-Log
    await db.auditLog.create({
      data: {
        actorUserId: actor.userId || null,
        actorEmail: actor.email || null,
        entityType: params.entity.type,
        entityId: params.entity.id || null,
        entityLabel: params.entity.label || null,
        action: params.action,
        message: params.message || null,
        meta: params.meta ? JSON.parse(JSON.stringify(params.meta)) : null,
      },
    });
  } catch (error) {
    // Fallback: Console-Log wenn DB-Logging fehlschlägt
    console.error("[AuditLog] Failed to write audit log:", error);
    console.error("[AuditLog] Original params:", params);
  }
}

/**
 * Holt Actor-Informationen aus der aktuellen Session
 */
export async function getActorFromSession(): Promise<AuditActor> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      return {
        userId: session.user.id,
        email: session.user.email || undefined,
      };
    }
  } catch (error) {
    // Ignoriere Fehler (z.B. wenn keine Session vorhanden)
  }
  return {};
}

/**
 * Helper: Ermittelt geänderte Felder zwischen zwei Objekten
 * Nur shallow comparison, nur ausgewählte Felder
 */
export function getChangedFields(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fieldsToCheck?: string[]
): string[] {
  const fields = fieldsToCheck || Object.keys(newData);
  const changed: string[] = [];

  for (const field of fields) {
    if (oldData[field] !== newData[field]) {
      changed.push(field);
    }
  }

  return changed;
}





