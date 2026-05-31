import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { CookieCatalogItem, normalizeCookieSuggestion } from "@/lib/consent/catalog";
import { getOpenAIModel } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ITEMS = 20;

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "EDITOR"], { throwError: true });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key ist nicht konfiguriert" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const cookies = Array.isArray(body?.cookies) ? body.cookies : null;

    if (!cookies || cookies.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const limitedCookies = cookies.slice(0, MAX_ITEMS).map((item: CookieCatalogItem) => ({
      name: item?.name,
      category: item?.category,
      purpose: item?.purpose,
      provider: item?.provider,
      duration: item?.duration,
    }));

    const systemPrompt =
      "Du bist ein Datenschutz- und Cookie-Experte. " +
      "Ordne Cookies einer Kategorie zu und ergänze fehlende Details. " +
      "Antworte ausschließlich im JSON-Format: {\"items\":[{\"name\":\"...\",\"category\":\"necessary|statistics|marketing|unknown\",\"purpose\":\"...\",\"provider\":\"...\",\"duration\":\"...\",\"confidence\":\"low|medium|high\",\"source\":\"ai\"}]}";

    const userPrompt =
      "Ergänze die fehlenden Felder für die folgenden Cookies. " +
      "Nutze nur die Kategorien necessary, statistics, marketing oder unknown. " +
      "Wenn du unsicher bist, nutze unknown und leere Strings. " +
      "Cookies:\n" +
      JSON.stringify(limitedCookies, null, 2);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API Error:", errorData);
      return NextResponse.json(
        { error: "Fehler bei der Cookie-Anreicherung" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "Keine Antwort von ChatGPT erhalten" },
        { status: 500 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Ungültiges Antwortformat von ChatGPT" },
        { status: 500 }
      );
    }

    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const normalized = items
      .map((item: any) => normalizeCookieSuggestion(item))
      .filter((item: CookieCatalogItem | null): item is CookieCatalogItem => item !== null);

    return NextResponse.json({ items: normalized });
  } catch (error: any) {
    if (error?.message === "Unauthorized" || error?.message === "Forbidden") {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("[CookieClassify] Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
