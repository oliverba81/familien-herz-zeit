import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getOpenAIModel } from "@/lib/openai";

export const dynamic = "force-dynamic";

/**
 * POST /api/generate-page-seo
 * Generiert Meta-Beschreibung und Meta-Keywords für eine Seite (SEO/KI-optimiert) per ChatGPT.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], {
      throwError: true,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const contentSummary = typeof body.contentSummary === "string" ? body.contentSummary.trim() : undefined;
    const contentHtml = typeof body.contentHtml === "string" ? body.contentHtml.trim() : undefined;

    if (!title) {
      return NextResponse.json(
        { error: "Titel ist erforderlich" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key ist nicht konfiguriert" },
        { status: 500 }
      );
    }

    // Gesamten Seiteninhalt nutzen (bis 12.000 Zeichen), damit die KI die Seite sinngemäß erfasst
    const maxTextLength = 12000;
    const fullTextFromHtml =
      contentHtml &&
      contentHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const primaryText = (
      fullTextFromHtml && fullTextFromHtml.length > 0
        ? fullTextFromHtml
        : contentSummary ?? ""
    ).slice(0, maxTextLength);
    const hasContent = primaryText.length > 0;

    const contextParts = [
      `Seitentitel: ${title}`,
      "",
      "Vollständiger Seiteninhalt (aus dem WYSIWYG-Editor – lies und verstehe die gesamte Seite):",
      "---",
      primaryText,
      "---",
    ];

    const context = contextParts.join("\n");

    const prompt = hasContent
      ? `Aufgabe: Lies den obigen Seiteninhalt vollständig und verstehe sinngemäß, worum es auf der Seite geht (Thema, Botschaft, Zielgruppe, Angebote, Kernaussagen).

Erstelle daraus:
1. Eine Meta-Beschreibung (120–158 Zeichen), die den Inhalt der Seite treffend zusammenfasst – so, dass ein Suchender sofort erkennt, worum es geht. Keine generischen Floskeln.
2. 8–12 komma-getrennte Meta-Keywords, die das Thema und die konkreten Inhalte der Seite widerspiegeln.

Antworte ausschließlich mit diesem JSON, ohne anderen Text oder Markdown:
{"metaDescription": "...", "metaKeywords": "..."}`
      : `Erstelle für die Webseite "${title}" (deutsch):
1. Eine Meta-Beschreibung (120–158 Zeichen).
2. 8–12 komma-getrennte Meta-Keywords.

Antworte nur mit diesem JSON:
{"metaDescription": "...", "metaKeywords": "..."}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        messages: [
          {
            role: "system",
            content:
              "Du bist ein SEO-Experte. Deine Aufgabe: Du erhältst den vollständigen Inhalt einer Webseite. Lies ihn aufmerksam und erfasse sinngemäß, worum es auf der Seite geht (Thema, Botschaft, Angebote, Zielgruppe). Erstelle daraus eine prägnante Meta-Beschreibung und passende Keywords, die den Inhalt treffend wiedergeben – keine generischen Phrasen. Antworte nur mit dem angeforderten JSON (metaDescription, metaKeywords), ohne Erklärungen oder Markdown.",
          },
          {
            role: "user",
            content: `${context}\n\n${prompt}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 350,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[generate-page-seo] OpenAI API Error:", errorData);
      return NextResponse.json(
        { error: "Fehler beim Generieren mit ChatGPT" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "Keine Antwort von ChatGPT erhalten" },
        { status: 500 }
      );
    }

    let metaDescription: string | undefined;
    let metaKeywords: string | undefined;

    try {
      const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(cleaned);
      metaDescription = typeof parsed.metaDescription === "string" ? parsed.metaDescription.trim() : undefined;
      metaKeywords = typeof parsed.metaKeywords === "string" ? parsed.metaKeywords.trim() : undefined;
    } catch {
      const descMatch = content.match(/metaDescription["\s:]+["']?([^"']+)["']?/i);
      const kwMatch = content.match(/metaKeywords["\s:]+["']?([^"']+)["']?/i);
      metaDescription = descMatch?.[1]?.trim();
      metaKeywords = kwMatch?.[1]?.trim();
    }

    return NextResponse.json({
      metaDescription: metaDescription || "",
      metaKeywords: metaKeywords || "",
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json(
        { error: (error as { message: string }).message },
        { status: (error as { message: string }).message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("[generate-page-seo] Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
