import { NextRequest, NextResponse } from "next/server";
import { getOpenAIModel } from "@/lib/openai";

export const dynamic = "force-dynamic";

/**
 * POST /api/generate-story-metadata
 * Generiert Titel und/oder Teaser für eine Geschichte basierend auf dem Volltext
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullText, generateTitle, generateTeaser, generateReadingTime } = body;

    if (!fullText || typeof fullText !== "string") {
      return NextResponse.json(
        { error: "Volltext ist erforderlich" },
        { status: 400 }
      );
    }

    if (!generateTitle && !generateTeaser && !generateReadingTime) {
      return NextResponse.json(
        { error: "Mindestens Titel, Teaser oder Lesezeit muss generiert werden" },
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

    // Extrahiere Text aus HTML (entferne Tags)
    const textContent = fullText
      .replace(/<[^>]*>/g, " ") // Entferne HTML-Tags
      .replace(/\s+/g, " ") // Normalisiere Whitespace
      .trim();

    if (!textContent || textContent.length < 50) {
      return NextResponse.json(
        { error: "Der Text ist zu kurz. Bitte geben Sie mehr Inhalt ein." },
        { status: 400 }
      );
    }

    // Erstelle Prompt basierend auf was generiert werden soll
    let prompt = "";
    const parts: string[] = [];
    
    if (generateTitle) parts.push("Titel");
    if (generateTeaser) parts.push("Teaser");
    if (generateReadingTime) parts.push("Lesezeit");
    
    if (parts.length === 1) {
      // Nur ein Teil wird generiert
      if (generateTitle) {
        prompt = `Basierend auf folgender Geschichte, erstelle einen ansprechenden Titel (max. 60 Zeichen), der neugierig macht und zum Lesen einlädt.\n\nGeschichte:\n${textContent}\n\nAntworte nur mit dem Titel, ohne zusätzliche Erklärungen oder Anführungszeichen.`;
      } else if (generateTeaser) {
        prompt = `Basierend auf folgender Geschichte, erstelle einen kurzen Teaser (1-2 Sätze, max. 150 Zeichen), der neugierig macht und zum Lesen einlädt.\n\nGeschichte:\n${textContent}\n\nAntworte nur mit dem Teaser, ohne zusätzliche Erklärungen oder Anführungszeichen.`;
      } else if (generateReadingTime) {
        prompt = `Schätze die Lesezeit für folgende Geschichte. Antworte im Format "X min lesen" (z.B. "2 min lesen", "5 min lesen").\n\nGeschichte:\n${textContent}\n\nAntworte nur mit der Lesezeit im Format "X min lesen", ohne zusätzliche Erklärungen.`;
      }
    } else {
      // Mehrere Teile werden generiert - verwende JSON-Format
      const jsonFields: string[] = [];
      if (generateTitle) jsonFields.push('"title"');
      if (generateTeaser) jsonFields.push('"teaser"');
      if (generateReadingTime) jsonFields.push('"readingTime"');
      
      prompt = `Basierend auf folgender Geschichte, erstelle:${generateTitle ? ' einen ansprechenden Titel (max. 60 Zeichen)' : ''}${generateTeaser ? ' einen kurzen Teaser (1-2 Sätze, max. 150 Zeichen)' : ''}${generateReadingTime ? ' eine realistische Lesezeit im Format "X min lesen"' : ''}.\n\nGeschichte:\n${textContent}\n\nAntworte im JSON-Format: {${jsonFields.join(', ')}}`;
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
            content: "Du bist ein Experte für das Erstellen von ansprechenden Titeln und Teasern für Geschichten. Deine Titel und Teaser sollen neugierig machen, emotional ansprechend sein und zum Lesen einladen.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API Error:", errorData);
      return NextResponse.json(
        { error: "Fehler beim Generieren mit ChatGPT" },
        { status: response.status }
      );
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "Keine Antwort von ChatGPT erhalten" },
        { status: 500 }
      );
    }

    // Parse Antwort
    let title: string | undefined;
    let teaser: string | undefined;
    let readingTime: string | undefined;

    const generateCount = [generateTitle, generateTeaser, generateReadingTime].filter(Boolean).length;

    if (generateCount > 1) {
      // Mehrere Teile - versuche JSON zu parsen
      try {
        const parsed = JSON.parse(content);
        title = parsed.title?.trim();
        teaser = parsed.teaser?.trim();
        readingTime = parsed.readingTime?.trim();
      } catch {
        // Fallback: Versuche manuell zu extrahieren
        const titleMatch = content.match(/title["\s:]+["']?([^"']+)["']?/i);
        const teaserMatch = content.match(/teaser["\s:]+["']?([^"']+)["']?/i);
        const readingTimeMatch = content.match(/readingTime["\s:]+["']?([^"']+)["']?/i);
        title = titleMatch?.[1]?.trim();
        teaser = teaserMatch?.[1]?.trim();
        readingTime = readingTimeMatch?.[1]?.trim();
      }
    } else {
      // Nur ein Teil
      if (generateTitle) {
        title = content.replace(/^["']|["']$/g, "").trim();
      } else if (generateTeaser) {
        teaser = content.replace(/^["']|["']$/g, "").trim();
      } else if (generateReadingTime) {
        // Entferne Anführungszeichen und normalisiere Format
        readingTime = content.replace(/^["']|["']$/g, "").trim();
        // Stelle sicher, dass Format "X min lesen" ist
        if (readingTime && !readingTime.toLowerCase().includes("min")) {
          readingTime = `${readingTime} min lesen`;
        }
      }
    }

    return NextResponse.json({
      title,
      teaser,
      readingTime,
    });
  } catch (error: any) {
    console.error("[GenerateStoryMetadata] Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

