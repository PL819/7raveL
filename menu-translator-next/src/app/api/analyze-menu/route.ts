import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TranslationLanguage =
  | "en"
  | "zh-TW"
  | "fa"
  | "ru" // Russian
  | "si" // Sinhala - Sri Lanka
  | "hi"; // Hindi - India

interface LanguageOption {
  code: TranslationLanguage;
  label: string;
  nativeLabel: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "zh-TW", label: "Traditional Chinese", nativeLabel: "繁體中文" },
  { code: "fa", label: "Persian", nativeLabel: "فارسی" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "si", label: "Sinhala", nativeLabel: "සිංහල" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
];

function getLanguageOption(code: TranslationLanguage): LanguageOption {
  return LANGUAGE_OPTIONS.find((l) => l.code === code) ?? LANGUAGE_OPTIONS[0];
}

// ---------------------------------------------------------------------------
// Request body validation
// ---------------------------------------------------------------------------

const RequestBodySchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().min(1),
  sourceImageName: z.string().optional(),
  targetLanguage: z.enum(["en", "zh-TW", "fa", "ru", "si", "hi"]).optional(),
});

// ---------------------------------------------------------------------------
// Zod schema for the Gemini structured output
// ---------------------------------------------------------------------------

const GeminiMenuItemSchema = z.object({
  originalName: z.string(),
  translatedName: z.string(),
  price: z.number().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const GeminiMenuCategorySchema = z.object({
  name: z.string(),
  items: z.array(GeminiMenuItemSchema),
});

const GeminiMenuSchema = z.object({
  currency: z.string(),
  categories: z.array(GeminiMenuCategorySchema),
});

type GeminiMenu = z.infer<typeof GeminiMenuSchema>;

// ---------------------------------------------------------------------------
// Language-aware prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(targetLanguage: TranslationLanguage): string {
  const lang = getLanguageOption(targetLanguage);
  const isEnglish = targetLanguage === "en";

  const translationInstruction = isEnglish
    ? "translatedName should be a natural, appetising English translation — not a word-for-word literal"
    : `translatedName should be a natural ${lang.nativeLabel} (${lang.label}) translation of the dish name`;

  const categoryInstruction = isEnglish
    ? 'name should be the category name in English (e.g. "Starters", "Grilled Dishes")'
    : `name should be the category name in ${lang.nativeLabel}`;

  const descriptionInstruction = isEnglish
    ? "description should be a brief English description of the dish (optional, omit if unclear)"
    : `description should be a brief ${lang.nativeLabel} description of the dish (optional, omit if unclear)`;

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
- Return ONLY valid JSON — no markdown code fences, no explanation text`;
}

// ---------------------------------------------------------------------------
// Transform Gemini response → typed MenuData
// ---------------------------------------------------------------------------

function generateId(): string {
  return crypto.randomUUID();
}

interface MenuData {
  id: string;
  sourceImageName?: string;
  currency: string;
  categories: {
    id: string;
    name: string;
    items: {
      id: string;
      originalName: string;
      translatedName: string;
      price: number | null;
      description?: string;
      notes?: string;
      categoryId: string;
    }[];
  }[];
  createdAt: string;
}

function toMenuData(raw: GeminiMenu, sourceImageName?: string): MenuData {
  const categories = raw.categories.map((cat) => {
    const categoryId = generateId();
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
    };
  });

  return {
    id: generateId(),
    sourceImageName,
    currency: raw.currency,
    categories,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid request. Please provide a base64 image and mimeType.",
      },
      { status: 400 },
    );
  }

  const { base64, mimeType, sourceImageName, targetLanguage } = parsed.data;

  // Call Gemini via Vercel AI SDK
  try {
    const { output } = await generateText({
      model: google("gemini-3.5-flash"),
      system: buildSystemPrompt(targetLanguage ?? "en"),
      output: Output.object({ schema: GeminiMenuSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this menu image." },
            { type: "image", image: `data:${mimeType};base64,${base64}` },
          ],
        },
      ],
    });

    if (!output) {
      return NextResponse.json(
        {
          message:
            "The AI returned an empty response. Please try again with a clearer photo.",
        },
        { status: 500 },
      );
    }

    const menuData = toMenuData(output, sourceImageName);
    return NextResponse.json(menuData);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error during menu analysis.";

    console.error("[analyze-menu] Error:", message);

    return NextResponse.json(
      { message: `Analysis failed: ${message}` },
      { status: 500 },
    );
  }
}
