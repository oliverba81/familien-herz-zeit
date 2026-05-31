import { NextRequest, NextResponse } from "next/server";
import { getOpenAIModel } from "@/lib/openai";

export const dynamic = "force-dynamic";

/**
 * POST /api/optimize-html
 * Optimiert HTML-Code mit ChatGPT
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html } = body;

    if (!html || typeof html !== "string") {
      return NextResponse.json(
        { error: "HTML-Text ist erforderlich" },
        { status: 400 }
      );
    }

    // Prüfe ob OpenAI API Key vorhanden ist
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key ist nicht konfiguriert" },
        { status: 500 }
      );
    }

    // Rufe OpenAI API auf
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        messages: [
          {
            role: "system",
            content: "Du bist ein HTML-Optimierungsexperte. Deine Aufgabe ist es, HTML-Code zu optimieren, indem du:\n1. Überflüssige Tags und verschachtelte Strukturen entfernst\n2. Die Semantik und Bedeutung des Inhalts beibehältst\n3. Sauberen, validen HTML-Code zurückgibst\n4. Nur den optimierten HTML-Code zurückgibst, ohne zusätzliche Erklärungen oder Markdown-Formatierung\n5. Alle Formatierungen (fett, kursiv, Links, etc.) beibehältst",
          },
          {
            role: "user",
            content: `Bitte optimiere folgenden HTML-Code:\n\n${html}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API Error:", errorData);
      return NextResponse.json(
        { error: "Fehler beim Optimieren des HTML-Codes" },
        { status: response.status }
      );
    }

    const data = await response.json();
    let optimizedHtml = data.choices?.[0]?.message?.content?.trim();

    if (!optimizedHtml) {
      return NextResponse.json(
        { error: "Keine Antwort von ChatGPT erhalten" },
        { status: 500 }
      );
    }

    // Entferne mögliche Markdown-Codeblöcke (```html ... ```)
    optimizedHtml = optimizedHtml.replace(/^```html\s*/i, "").replace(/\s*```$/i, "");
    optimizedHtml = optimizedHtml.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    optimizedHtml = optimizedHtml.trim();

    return NextResponse.json({
      optimizedHtml,
    });
  } catch (error: any) {
    console.error("[OptimizeHTML] Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

