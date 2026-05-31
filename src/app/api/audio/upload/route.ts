import { NextRequest, NextResponse } from "next/server";
import { requireRoleOrThrow } from "@/lib/auth/guards";
import { join } from "path";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { randomBytes } from "crypto";

/**
 * POST /api/audio/upload
 * Lädt eine Audio-Datei hoch (auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleOrThrow(["ADMIN", "EDITOR"]);

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // Prüfe, ob es eine Audio-Datei ist
    const mimeType = file.type;
    if (!mimeType.startsWith("audio/")) {
      return NextResponse.json(
        { error: "Ungültiger Dateityp. Nur Audio-Dateien sind erlaubt." },
        { status: 400 }
      );
    }

    // Erstelle Upload-Verzeichnis
    const uploadDir = join(process.cwd(), "public", "uploads", "audio");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generiere eindeutigen Dateinamen
    const timestamp = Date.now();
    const randomString = randomBytes(8).toString("hex");
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    // Speichere Datei
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Erstelle öffentliche URL
    const url = `/uploads/audio/${fileName}`;

    return NextResponse.json({ url, fileName }, { status: 201 });
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Fehler beim Hochladen der Audio-Datei:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

