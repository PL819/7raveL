import { NextRequest, NextResponse } from "next/server"

import { analyzeMenuBatchWithGemini } from "@/lib/gemini-menu-analysis"
import {
  AnalyzeMenuBatchInputSchema,
  AnalyzeMenuImageInputSchema,
} from "@/types/analyze-menu"

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON in request body." },
      { status: 400 },
    )
  }

  const parsedBatch = AnalyzeMenuBatchInputSchema.safeParse(body)
  const parsedSingle = parsedBatch.success
    ? null
    : AnalyzeMenuImageInputSchema.safeParse(body)

  const parsed = parsedBatch.success
    ? parsedBatch.data
    : parsedSingle?.success
      ? {
          images: [
            {
              base64: parsedSingle.data.base64,
              mimeType: parsedSingle.data.mimeType,
              sourceImageName: parsedSingle.data.sourceImageName,
            },
          ],
          targetLanguage: parsedSingle.data.targetLanguage,
        }
      : null

  if (!parsed) {
    return NextResponse.json(
      {
        message:
          "Invalid request. Please provide 1 to 5 images with base64 data and mimeType.",
      },
      { status: 400 },
    )
  }

  try {
    const { menuData } = await analyzeMenuBatchWithGemini(parsed, {
      includeRequestBody: false,
      includeResponseBody: false,
    })

    return NextResponse.json(menuData)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during menu analysis."

    console.error("[analyze-menu] Error:", message)

    return NextResponse.json(
      { message: `Analysis failed: ${message}` },
      { status: 500 },
    )
  }
}
