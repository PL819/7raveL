import { google } from "@ai-sdk/google"
import { generateText, Output, type CallWarning, type LanguageModelUsage } from "ai"
import { z } from "zod"

import { generateId } from "@/lib/generate-id"
import { getLanguageOption } from "@/lib/translation-languages"
import type {
  AnalyzeMenuBatchInput,
  AnalyzeMenuImageInput,
} from "@/types/analyze-menu"
import type { MenuData, TranslationLanguage } from "@/types/menu"

export const GEMINI_MENU_MODEL = "gemini-3.5-flash"
export const GEMINI_MENU_USER_INSTRUCTION = "Analyze this menu image."

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

export const GeminiMenuSchema = z.object({
  currency: z.string(),
  categories: z.array(GeminiMenuCategorySchema),
})

export type GeminiMenu = z.infer<typeof GeminiMenuSchema>

export interface GeminiAnalysisDebugReport {
  model: string
  systemPrompt: string
  userInstruction: string
  text: string
  finishReason: string
  rawFinishReason?: string
  usage: LanguageModelUsage
  totalUsage: LanguageModelUsage
  warnings?: readonly CallWarning[]
  requestBody?: unknown
  responseBody?: unknown
  responseMessages: readonly unknown[]
  response: {
    id: string
    modelId: string
    timestamp: string
    headers?: Record<string, string>
  }
  providerMetadata?: unknown
  durationMs: number
}

export interface AnalyzeMenuWithGeminiOptions {
  includeRequestBody?: boolean
  includeResponseBody?: boolean
}

export interface AnalyzeMenuWithGeminiResult {
  rawMenu: GeminiMenu
  menuData: MenuData
  debug: GeminiAnalysisDebugReport
}

export interface AnalyzeMenuBatchWithGeminiResult {
  menuData: MenuData
  menus: MenuData[]
  debug: GeminiAnalysisDebugReport[]
}

export function buildSystemPrompt(targetLanguage: TranslationLanguage): string {
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

function buildGeminiMessages(base64: string, mimeType: string) {
  return [
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: GEMINI_MENU_USER_INSTRUCTION },
        { type: "image" as const, image: `data:${mimeType};base64,${base64}` },
      ],
    },
  ]
}

function toMenuData(raw: GeminiMenu, sourceImageName?: string): MenuData {
  const categories = raw.categories.map((category) => {
    const categoryId = generateId()

    return {
      id: categoryId,
      name: category.name,
      items: category.items.map((item) => ({
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
    sourceImageNames: sourceImageName ? [sourceImageName] : undefined,
    currency: raw.currency,
    categories,
    createdAt: new Date().toISOString(),
  }
}

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? ""
}

function firstNonEmptyString(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => value?.trim())
}

function firstNonNullNumber(
  ...values: Array<number | null | undefined>
): number | null {
  for (const value of values) {
    if (typeof value === "number") return value
  }

  return null
}

export function consolidateMenuData(menus: MenuData[]): MenuData {
  const categoryLookup = new Map<
    string,
    {
      id: string
      index: number
    }
  >()
  const consolidatedCategories: MenuData["categories"] = []
  const sourceImageNames = menus
    .flatMap((menu) => menu.sourceImageNames ?? [])
    .filter(Boolean)
  const currency = firstNonEmptyString(...menus.map((menu) => menu.currency)) ?? "USD"

  for (const menu of menus) {
    for (const category of menu.categories) {
      const categoryKey = normalizeKey(category.name)
      let categoryRecord = categoryLookup.get(categoryKey)

      if (!categoryRecord) {
        const id = generateId()
        consolidatedCategories.push({
          id,
          name: category.name,
          items: [],
        })
        categoryRecord = {
          id,
          index: consolidatedCategories.length - 1,
        }
        categoryLookup.set(categoryKey, categoryRecord)
      }

      const consolidatedCategory = consolidatedCategories[categoryRecord.index]

      for (const item of category.items) {
        const itemKey = normalizeKey(item.translatedName)
        const existingItem = consolidatedCategory.items.find(
          (candidate) => normalizeKey(candidate.translatedName) === itemKey,
        )

        if (existingItem) {
          existingItem.originalName =
            firstNonEmptyString(existingItem.originalName, item.originalName) ?? ""
          existingItem.translatedName =
            firstNonEmptyString(existingItem.translatedName, item.translatedName) ?? ""
          existingItem.description = firstNonEmptyString(
            existingItem.description,
            item.description,
          )
          existingItem.notes = firstNonEmptyString(existingItem.notes, item.notes)
          existingItem.price = firstNonNullNumber(existingItem.price, item.price)
          continue
        }

        consolidatedCategory.items.push({
          ...item,
          id: generateId(),
          categoryId: consolidatedCategory.id,
        })
      }
    }
  }

  return {
    id: generateId(),
    sourceImageName:
      sourceImageNames.length === 1 ? sourceImageNames[0] : undefined,
    sourceImageNames: sourceImageNames.length > 0 ? sourceImageNames : undefined,
    currency,
    categories: consolidatedCategories,
    createdAt: new Date().toISOString(),
  }
}

export async function analyzeMenuWithGemini(
  input: AnalyzeMenuImageInput,
  options: AnalyzeMenuWithGeminiOptions = {},
): Promise<AnalyzeMenuWithGeminiResult> {
  const targetLanguage = input.targetLanguage ?? "en"
  const systemPrompt = buildSystemPrompt(targetLanguage)
  const messages = buildGeminiMessages(input.base64, input.mimeType)
  const startedAt = Date.now()

  const result = await generateText({
    model: google(GEMINI_MENU_MODEL),
    system: systemPrompt,
    output: Output.object({ schema: GeminiMenuSchema }),
    messages,
    experimental_include: {
      requestBody: options.includeRequestBody ?? false,
      responseBody: options.includeResponseBody ?? false,
    },
  })

  const durationMs = Date.now() - startedAt
  const output = result.output

  if (!output) {
    throw new Error(
      "The AI returned an empty response. Please try again with a clearer photo.",
    )
  }

  return {
    rawMenu: output,
    menuData: toMenuData(output, input.sourceImageName),
    debug: {
      model: GEMINI_MENU_MODEL,
      systemPrompt,
      userInstruction: GEMINI_MENU_USER_INSTRUCTION,
      text: result.text,
      finishReason: result.finishReason,
      rawFinishReason: result.rawFinishReason,
      usage: result.usage,
      totalUsage: result.totalUsage,
      warnings: result.warnings,
      requestBody: result.request.body,
      responseBody: result.response.body,
      responseMessages: result.response.messages,
      response: {
        id: result.response.id,
        modelId: result.response.modelId,
        timestamp: result.response.timestamp.toISOString(),
        headers: result.response.headers,
      },
      providerMetadata: result.providerMetadata,
      durationMs,
    },
  }
}

export async function analyzeMenuBatchWithGemini(
  input: AnalyzeMenuBatchInput,
  options: AnalyzeMenuWithGeminiOptions = {},
): Promise<AnalyzeMenuBatchWithGeminiResult> {
  const menus: MenuData[] = []
  const debug: GeminiAnalysisDebugReport[] = []

  for (const image of input.images) {
    const result = await analyzeMenuWithGemini(
      {
        ...image,
        targetLanguage: input.targetLanguage,
      },
      options,
    )

    menus.push(result.menuData)
    debug.push(result.debug)
  }

  return {
    menuData: consolidateMenuData(menus),
    menus,
    debug,
  }
}
