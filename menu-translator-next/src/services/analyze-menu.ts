import type { MenuData, TranslationLanguage } from "@/types/menu"

export interface AnalyzeMenuImageInput {
  base64: string
  mimeType: string
  sourceImageName?: string
  targetLanguage?: TranslationLanguage
}

export async function analyzeMenuImage(
  input: AnalyzeMenuImageInput,
): Promise<MenuData> {
  const res = await fetch("/api/analyze-menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Analysis failed. Please try again." }))
    throw new Error(err.message ?? "Analysis failed. Please try again.")
  }

  return res.json()
}
