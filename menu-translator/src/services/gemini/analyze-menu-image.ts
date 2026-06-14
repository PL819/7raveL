import { z } from "zod"

import { generateId } from "@/lib/generate-id"
import { getLanguageOption } from "@/lib/translation-languages"
import type { MenuData, TranslationLanguage } from "@/types/menu"

import { createGeminiClient } from "./client"

const GEMINI_MODEL = "gemini-2.0-flash"

// ---------------------------------------------------------------------------
// Zod schemas for the raw Gemini JSON response
// ---------------------------------------------------------------------------

const GeminiMenuItemSchema = z.object({
  originalName: z.string(),
  translatedName: z.string(),
  price: z.number().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
})

const GeminiMenuCategorySchema = z.object({
  name: z.string(),
  items: z.array(GeminiMenuItemSchema),
})

const GeminiMenuSchema = z.object({
  currency: z.string(),
  categories: z.array(GeminiMenuCategorySchema),
})

type GeminiMenu = z.infer<typeof GeminiMenuSchema>

// ---------------------------------------------------------------------------
// Language-aware prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(targetLanguage: TranslationLanguage): string {
  const lang = getLanguageOption(targetLanguage)
  const isEnglish = targetLanguage === "en"

  const translationInstruction = isEnglish
    ? "translatedName should be a natural, appetising English translation — not a word-for-word literal"
    : `translatedName should be a natural ${lang.nativeLabel} (${lang.label}) translation of the dish name`

  const categoryInstruction = isEnglish
    ? 'name should be the category name in English (e.g. "Starters", "Grilled Dishes")'
    : `name should be the category name in ${lang.nativeLabel}`

  const descriptionInstruction = isEnglish
    ? "description should be a brief English description of the dish (optional, omit if unclear)"
    : `description should be a brief ${lang.nativeLabel} description of the dish (optional, omit if unclear)`

  return `You are a restaurant menu translator and analyzer.

Analyze the provided menu image and return a JSON object with this exact structure:

{
  "currency": "JPY",
  "categories": [
    {
      "name": "Category name",
      "items": [
        {
          "originalName": "Original name exactly as written on the menu",
          "translatedName": "Translated name in ${lang.nativeLabel}",
          "price": 1280,
          "description": "Brief description in ${lang.nativeLabel} (optional)",
          "notes": "Allergens, spice level, or special notes (optional)"
        }
      ]
    }
  ]
}

Rules:
- Extract ALL visible categories and items
- Keep originalName exactly as it appears on the menu (preserve original script)
- ${translationInstruction}
- ${categoryInstruction}
- ${descriptionInstruction}
- price must be a plain number without any currency symbol, or null if not shown
- currency must be ISO 4217 (e.g. JPY, USD, EUR, THB, CNY, KRW)
- Infer currency from visible symbols: ¥ → JPY, $ → USD, € → EUR, ฿ → THB
- Return ONLY valid JSON — no markdown code fences, no explanation text`
}

// ---------------------------------------------------------------------------
// Transform Gemini response → typed MenuData
// ---------------------------------------------------------------------------

function toMenuData(raw: GeminiMenu, sourceImageName?: string): MenuData {
  const categories = raw.categories.map((cat) => {
    const categoryId = generateId()
    return {
      id: categoryId,
      name: cat.name,
      items: cat.items.map((item) => ({
        id: generateId(),
        originalName: item.originalName,
        translatedName: item.translatedName,
        price: item.price,
        description: item.description,
        notes: item.notes,
        categoryId,
      })),
    }
  })

  return {
    id: generateId(),
    sourceImageName,
    currency: raw.currency,
    categories,
    createdAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AnalyzeMenuImageInput {
  base64: string
  mimeType: string
  sourceImageName?: string
  targetLanguage?: TranslationLanguage
}

export async function analyzeMenuImage(
  input: AnalyzeMenuImageInput,
): Promise<MenuData> {
  const client = createGeminiClient()
  const prompt = buildSystemPrompt(input.targetLanguage ?? "en")

  let responseText: string
  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: input.base64,
                mimeType: input.mimeType,
              },
            },
          ],
        },
      ],
    })
    responseText = response.text ?? ""
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown API error"
    throw new Error(`Gemini API error: ${message}`)
  }

  // Strip markdown fences if the model wraps the JSON despite instructions
  const cleaned = responseText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(
      "The AI returned an unreadable response. Please try again with a clearer photo.",
    )
  }

  const result = GeminiMenuSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      "The AI response was in an unexpected format. Please try again.",
    )
  }

  return toMenuData(result.data, input.sourceImageName)
}
