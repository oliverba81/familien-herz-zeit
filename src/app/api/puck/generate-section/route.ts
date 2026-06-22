import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getOpenAIModel } from "@/lib/openai";
import {
  SECTION_SYSTEM_PROMPT,
  buildSectionUserPrompt,
  validateGeneratedNodes,
} from "@/lib/puck/ai-section";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/puck/generate-section
 * Erzeugt aus einem Prompt valide Puck-Knoten (Inline-KI, Feature 7).
 * Die KI-Ausgabe wird strikt gegen die erlaubten Komponenten validiert.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], { throwError: true });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "Prompt ist erforderlich" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key ist nicht konfiguriert" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        messages: [
          { role: "system", content: SECTION_SYSTEM_PROMPT },
          { role: "user", content: buildSectionUserPrompt(prompt) },
        ],
        temperature: 0.6,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("[generate-section] OpenAI API Error:", err);
      return NextResponse.json(
        { error: "Fehler beim Generieren mit KI" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = null;
    }

    const nodes = validateGeneratedNodes(parsed);
    if (nodes.length === 0) {
      return NextResponse.json(
        { error: "KI lieferte keine verwertbaren Blöcke. Bitte Prompt anpassen." },
        { status: 422 }
      );
    }

    return NextResponse.json({ nodes });
  } catch (error) {
    const message = (error as Error)?.message;
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json(
        { error: message },
        { status: message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Error generating section:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
