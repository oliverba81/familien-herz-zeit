import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations/user";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/user/register
 * Registriert einen neuen Kunden
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Prüfe ob User bereits existiert
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Diese E-Mail-Adresse ist bereits registriert" },
        { status: 409 }
      );
    }

    // Hash Passwort
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Erstelle User
    const user = await db.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        role: "CUSTOMER",
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        address: validatedData.address || null,
        city: validatedData.city || null,
        zip: validatedData.zip || null,
        country: validatedData.country || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    await logger.success("AUTH", "USER_REGISTERED", `New user registered: ${user.email}`, {
      userId: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return NextResponse.json(
      { message: "Registrierung erfolgreich", user },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Fehler bei der Registrierung:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

