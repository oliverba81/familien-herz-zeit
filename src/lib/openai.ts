/**
 * OpenAI-Konfiguration aus Umgebungsvariablen.
 * OPENAI_MODEL: Modell für Chat Completions (z. B. gpt-4o-mini, gpt-4o).
 * Fallback: gpt-4o-mini
 */
export function getOpenAIModel(): string {
  const model = process.env.OPENAI_MODEL?.trim();
  return model && model.length > 0 ? model : "gpt-4o-mini";
}
