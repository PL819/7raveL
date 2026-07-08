import { z } from "zod"

import type { TranslationLanguage } from "@/types/menu"

export interface AnalyzeMenuImagePayload {
  base64: string
  mimeType: string
  sourceImageName?: string
}

export interface AnalyzeMenuImageInput {
  base64: string
  mimeType: string
  sourceImageName?: string
  targetLanguage?: TranslationLanguage
}

export interface AnalyzeMenuBatchInput {
  images: AnalyzeMenuImagePayload[]
  targetLanguage?: TranslationLanguage
}

export const AnalyzeMenuImagePayloadSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().min(1),
  sourceImageName: z.string().optional(),
})

export const AnalyzeMenuImageInputSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().min(1),
  sourceImageName: z.string().optional(),
  targetLanguage: z.enum(["en", "zh-TW", "fa", "ru", "si", "hi"]).optional(),
})

export const AnalyzeMenuBatchInputSchema = z.object({
  images: z.array(AnalyzeMenuImagePayloadSchema).min(1).max(5),
  targetLanguage: z.enum(["en", "zh-TW", "fa", "ru", "si", "hi"]).optional(),
})
