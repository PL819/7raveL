import { GoogleGenAI } from "@google/genai"

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GeminiConfigError"
  }
}

/**
 * Creates a GoogleGenAI client using VITE_GEMINI_API_KEY.
 * Called lazily per request so the app loads even when the key is absent —
 * the error is surfaced at call time with a helpful message.
 */
export function createGeminiClient(): GoogleGenAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) {
    throw new GeminiConfigError(
      "Gemini API key is missing.\n" +
        "Add VITE_GEMINI_API_KEY to your .env.local file.\n" +
        "Get a free key at https://aistudio.google.com/apikey",
    )
  }
  return new GoogleGenAI({ apiKey })
}
