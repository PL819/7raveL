import type { AnalyzeMenuBatchInput, AnalyzeMenuImageInput } from "@/types/analyze-menu"
import type { MenuData } from "@/types/menu"

export async function analyzeMenuImages(
  input: AnalyzeMenuBatchInput,
): Promise<MenuData> {
  const res = await fetch("/api/analyze-menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: "Analysis failed. Please try again." }))
    throw new Error(err.message ?? "Analysis failed. Please try again.")
  }

  return res.json()
}

export async function analyzeMenuImage(
  input: AnalyzeMenuImageInput,
): Promise<MenuData> {
  const { targetLanguage, ...image } = input

  return analyzeMenuImages({
    images: [image],
    targetLanguage,
  })
}
