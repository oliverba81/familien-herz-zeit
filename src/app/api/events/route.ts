import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const eventSchema = z.object({
  event: z.enum(["booking_submitted", "checkout_started", "purchase_success"]),
  props: z.record(z.string(), z.any()).optional(),
});

/**
 * POST /api/events
 * Serverseitiges Event Logging (anonymisiert, ohne PII)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = eventSchema.parse(body);

    // Anonymisiere Props (entferne PII)
    const anonymizedProps = validated.props ? anonymizeProps(validated.props) : {};

    // Optional: Speichere in DB (für Stunde 19 optional, hier nur Log)
    console.log("[Analytics Event]", {
      event: validated.event,
      props: anonymizedProps,
      timestamp: new Date().toISOString(),
      // Keine IP, kein User-Agent (DSGVO-konform)
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Ungültige Event-Daten", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[Events API] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Verarbeiten des Events" },
      { status: 500 }
    );
  }
}

/**
 * Anonymisiert Props (entfernt PII)
 */
function anonymizeProps(props: Record<string, any>): Record<string, any> {
  const anonymized: Record<string, any> = {};
  const piiFields = ["email", "name", "firstName", "lastName", "phone", "address", "city", "zip"];

  for (const [key, value] of Object.entries(props)) {
    const lowerKey = key.toLowerCase();
    if (piiFields.some((pii) => lowerKey.includes(pii))) {
      // PII-Feld → nicht tracken
      continue;
    }
    anonymized[key] = value;
  }

  return anonymized;
}



