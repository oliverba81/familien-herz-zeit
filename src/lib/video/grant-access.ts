import { db } from "@/lib/db";
import { generateToken } from "@/lib/utils/token";
import { sendEmail } from "@/lib/email/mailer";
import { renderVideoAccessEmail } from "@/lib/email/templates/videoAccess";
import { createInvoiceForPurchase } from "@/lib/invoice/create-invoice";
import { logger } from "@/lib/logging/logger";

export interface GrantVideoAccessResult {
  ok: boolean;
  watchUrl?: string;
  mailSent: boolean;
  alreadyGranted?: boolean;
  error?: string;
}

/**
 * Schaltet den Zugang zu einem Videokurs für einen Kauf frei:
 * - setzt den Kauf auf PAID (inkl. paidAt),
 * - erstellt einen Zugangs-Token (90 Tage),
 * - versendet die Zugangs-E-Mail,
 * - erstellt die Rechnung (best-effort).
 *
 * Idempotent: Existiert bereits ein gültiger Token, wird kein neuer erstellt.
 * Wird u. a. nach manueller Bestätigung einer Überweisung im Admin aufgerufen.
 */
export async function grantVideoAccess(
  purchaseId: string
): Promise<GrantVideoAccessResult> {
  const purchase = await db.videoPurchase.findUnique({
    where: { id: purchaseId },
    include: { videoCourse: true },
  });

  if (!purchase) {
    return { ok: false, mailSent: false, error: "Kauf nicht gefunden" };
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  // Idempotenz: bereits ein gültiger Token vorhanden?
  const existingToken = await db.videoAccessToken.findFirst({
    where: {
      videoCourseId: purchase.videoCourseId,
      email: purchase.email,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingToken) {
    // Sicherstellen, dass der Status PAID ist
    if (purchase.status !== "PAID") {
      await db.videoPurchase.update({
        where: { id: purchase.id },
        data: { status: "PAID", paidAt: purchase.paidAt ?? new Date() },
      });
    }
    const watchUrl = new URL(
      `/videokurse/watch/${existingToken.token}`,
      baseUrl
    ).toString();
    return { ok: true, watchUrl, mailSent: false, alreadyGranted: true };
  }

  // Status auf PAID setzen
  if (purchase.status !== "PAID") {
    await db.videoPurchase.update({
      where: { id: purchase.id },
      data: { status: "PAID", paidAt: purchase.paidAt ?? new Date() },
    });
  }

  // Access-Token (90 Tage)
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  await db.videoAccessToken.create({
    data: {
      token,
      videoCourseId: purchase.videoCourseId,
      email: purchase.email,
      expiresAt,
    },
  });

  await logger.success(
    "PAYMENT",
    "PAYMENT_COMPLETED",
    `Zugang freigeschaltet für Kauf ${purchase.id}`,
    {
      purchaseId: purchase.id,
      videoCourseId: purchase.videoCourseId,
      amountCents: purchase.amountCents,
      provider: purchase.provider,
      email: purchase.email,
    }
  );

  const watchUrl = new URL(`/videokurse/watch/${token}`, baseUrl).toString();

  // Zugangs-E-Mail (best-effort)
  let mailSent = false;
  try {
    const emailContent = renderVideoAccessEmail({
      courseTitle: purchase.videoCourse.title,
      watchUrl,
      expiresAt,
      withdrawalConsent: purchase.withdrawalConsent,
    });
    await sendEmail({
      to: purchase.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
    mailSent = true;
  } catch (emailError: any) {
    await logger.warning(
      "PAYMENT",
      "EMAIL_SEND_FAILED",
      `Zugangs-E-Mail konnte nicht gesendet werden (Kauf ${purchase.id})`,
      undefined,
      emailError instanceof Error ? emailError : undefined,
      { purchaseId: purchase.id, email: purchase.email }
    );
  }

  // Rechnung (best-effort)
  try {
    const user = await db.user.findUnique({ where: { email: purchase.email } });
    if (user && !purchase.userId) {
      await db.videoPurchase.update({
        where: { id: purchase.id },
        data: { userId: user.id },
      });
    }
    await createInvoiceForPurchase(purchase.id);
  } catch (invoiceError: any) {
    await logger.error(
      "PAYMENT",
      "INVOICE_GENERATION_FAILED",
      `Rechnung konnte nicht erstellt werden (Kauf ${purchase.id})`,
      invoiceError instanceof Error ? invoiceError : undefined,
      { purchaseId: purchase.id }
    );
  }

  return { ok: true, watchUrl, mailSent };
}
