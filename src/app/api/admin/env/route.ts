import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liste der bearbeitbaren Environment-Variablen
const EDITABLE_ENV_VARS = [
  "OPENAI_API_KEY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_SECURE",
  "MAIL_FROM",
  "MAIL_ADMIN_TO",
  "APP_BASE_URL",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_MODE",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

// Variablen, die nicht bearbeitet werden sollten
const PROTECTED_VARS = [
  "DATABASE_URL",
  "NODE_ENV",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
];

/**
 * GET /api/admin/env
 * Gibt alle bearbeitbaren Environment-Variablen zurück (nur ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const envPath = join(process.cwd(), ".env");
    
    if (!existsSync(envPath)) {
      return NextResponse.json({ error: ".env Datei nicht gefunden" }, { status: 404 });
    }

    const envContent = readFileSync(envPath, "utf-8");
    const envVars: Record<string, string> = {};

    // Parse .env Datei
    envContent.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const match = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Entferne Anführungszeichen
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (EDITABLE_ENV_VARS.includes(key)) {
            envVars[key] = value;
          }
        }
      }
    });

    return NextResponse.json(envVars);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Abrufen der Environment-Variablen:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/env
 * Aktualisiert Environment-Variablen (nur ADMIN)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const envPath = join(process.cwd(), ".env");

    if (!existsSync(envPath)) {
      return NextResponse.json({ error: ".env Datei nicht gefunden" }, { status: 404 });
    }

    // Lese aktuelle .env Datei
    const envContent = readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");
    const updatedLines: string[] = [];
    const updatedKeys = new Set<string>();

    // Aktualisiere bestehende Variablen
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const match = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          if (EDITABLE_ENV_VARS.includes(key) && body[key] !== undefined) {
            // Aktualisiere die Variable
            const value = String(body[key]).trim();
            updatedLines.push(`${key}="${value}"`);
            updatedKeys.add(key);
          } else if (!PROTECTED_VARS.includes(key)) {
            // Behalte die ursprüngliche Zeile
            updatedLines.push(line);
          } else {
            // Behalte geschützte Variablen
            updatedLines.push(line);
          }
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    });

    // Füge neue Variablen hinzu, die noch nicht existieren
    EDITABLE_ENV_VARS.forEach((key) => {
      if (body[key] !== undefined && !updatedKeys.has(key)) {
        const value = String(body[key]).trim();
        updatedLines.push(`${key}="${value}"`);
      }
    });

    // Schreibe aktualisierte .env Datei
    writeFileSync(envPath, updatedLines.join("\n"), "utf-8");

    // Aktualisiere process.env für die aktuelle Session
    EDITABLE_ENV_VARS.forEach((key) => {
      if (body[key] !== undefined) {
        process.env[key] = String(body[key]).trim();
      }
    });

    return NextResponse.json({ success: true, message: "Environment-Variablen aktualisiert" });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Aktualisieren der Environment-Variablen:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

