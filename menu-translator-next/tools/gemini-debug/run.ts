#!/usr/bin/env tsx

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { analyzeMenuWithGemini } from "../../src/lib/gemini-menu-analysis"
import type { AnalyzeMenuImageInput } from "../../src/types/analyze-menu"
import type { TranslationLanguage } from "../../src/types/menu"

const SAMPLE_IMAGES_DIR = path.resolve(
  process.cwd(),
  "tools/gemini-debug/sample-images",
)
const REPORTS_DIR = path.resolve(process.cwd(), "tools/gemini-debug/reports")

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
}

interface CliOptions {
  imagePath: string
  targetLanguage: TranslationLanguage
  reportPath?: string
  sourceImageName?: string
}

function printHelp(): void {
  console.log(`Usage:
  npm run gemini:debug -- --image tools/gemini-debug/sample-images/<file> [--language en|zh-TW] [--report tools/gemini-debug/reports/<file>.json] [--source-name "<name>"]

Examples:
  npm run gemini:debug -- --image tools/gemini-debug/sample-images/ramen-menu.jpg
  npm run gemini:debug -- --image tools/gemini-debug/sample-images/ramen-menu.jpg --language zh-TW

Sample image directory:
  ${path.relative(process.cwd(), SAMPLE_IMAGES_DIR)}`)
}

function requireArgValue(
  args: string[],
  index: number,
  flag: string,
): string {
  const value = args[index + 1]

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`)
  }

  return value
}

function parseLanguage(value: string): TranslationLanguage {
  if (value === "en" || value === "zh-TW") {
    return value
  }

  throw new Error(`Unsupported language "${value}". Use "en" or "zh-TW".`)
}

function parseArgs(args: string[]): CliOptions {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp()
    process.exit(0)
  }

  let imagePath: string | undefined
  let reportPath: string | undefined
  let sourceImageName: string | undefined
  let targetLanguage: TranslationLanguage = "en"

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    switch (arg) {
      case "--image":
        imagePath = requireArgValue(args, index, "--image")
        index += 1
        break
      case "--language":
        targetLanguage = parseLanguage(
          requireArgValue(args, index, "--language"),
        )
        index += 1
        break
      case "--report":
        reportPath = requireArgValue(args, index, "--report")
        index += 1
        break
      case "--source-name":
        sourceImageName = requireArgValue(args, index, "--source-name")
        index += 1
        break
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!imagePath) {
    throw new Error(
      `Missing --image. Put a sample menu image in ${path.relative(process.cwd(), SAMPLE_IMAGES_DIR)} and pass its path to the script.`,
    )
  }

  return {
    imagePath,
    targetLanguage,
    reportPath,
    sourceImageName,
  }
}

function getMimeType(imagePath: string): string {
  const extension = path.extname(imagePath).toLowerCase()
  const mimeType = MIME_TYPES_BY_EXTENSION[extension]

  if (!mimeType) {
    throw new Error(
      `Unsupported image extension "${extension}". Supported extensions: ${Object.keys(MIME_TYPES_BY_EXTENSION).join(", ")}.`,
    )
  }

  return mimeType
}

function createDefaultReportPath(imagePath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const baseName = path.basename(imagePath, path.extname(imagePath))

  return path.join(REPORTS_DIR, `${timestamp}-${baseName}.json`)
}

async function createAnalyzeMenuInput(
  imagePath: string,
  targetLanguage: TranslationLanguage,
  sourceImageName?: string,
): Promise<AnalyzeMenuImageInput & { imageBytes: number }> {
  const resolvedImagePath = path.resolve(process.cwd(), imagePath)
  const fileBuffer = await readFile(resolvedImagePath)

  return {
    base64: fileBuffer.toString("base64"),
    mimeType: getMimeType(resolvedImagePath),
    sourceImageName: sourceImageName ?? path.basename(resolvedImagePath),
    targetLanguage,
    imageBytes: fileBuffer.byteLength,
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required.")
  }

  const resolvedImagePath = path.resolve(process.cwd(), options.imagePath)
  const reportPath = options.reportPath
    ? path.resolve(process.cwd(), options.reportPath)
    : createDefaultReportPath(resolvedImagePath)
  const input = await createAnalyzeMenuInput(
    resolvedImagePath,
    options.targetLanguage,
    options.sourceImageName,
  )
  const { imageBytes, ...analysisInput } = input
  const result = await analyzeMenuWithGemini(analysisInput, {
    includeRequestBody: true,
    includeResponseBody: true,
  })

  const report = {
    generatedAt: new Date().toISOString(),
    input: {
      imagePath: resolvedImagePath,
      sourceImageName: analysisInput.sourceImageName,
      mimeType: analysisInput.mimeType,
      targetLanguage: analysisInput.targetLanguage,
      imageBytes,
      base64Length: analysisInput.base64.length,
    },
    debug: result.debug,
    rawMenu: result.rawMenu,
    menuData: result.menuData,
  }

  await mkdir(path.dirname(reportPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")

  console.log(`Report saved to ${path.relative(process.cwd(), reportPath)}`)
  console.log(`Response time: ${result.debug.durationMs}ms`)
  console.log(`Token usage: ${JSON.stringify(result.debug.totalUsage, null, 2)}`)
  console.log("\n=== SYSTEM PROMPT ===")
  console.log(result.debug.systemPrompt)
  console.log("\n=== USER PROMPT TEXT ===")
  console.log(result.debug.userInstruction)
  console.log("\n=== RAW REQUEST BODY ===")
  console.log(JSON.stringify(result.debug.requestBody, null, 2))
  console.log("\n=== RAW RESPONSE TEXT ===")
  console.log(result.debug.text)
  console.log("\n=== RAW RESPONSE BODY ===")
  console.log(JSON.stringify(result.debug.responseBody, null, 2))
  console.log("\n=== PROVIDER METADATA ===")
  console.log(JSON.stringify(result.debug.providerMetadata, null, 2))
  console.log("\n=== PARSED MENU OUTPUT ===")
  console.log(JSON.stringify(result.rawMenu, null, 2))
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error."

  console.error(`Gemini debug script failed: ${message}`)
  process.exitCode = 1
})
