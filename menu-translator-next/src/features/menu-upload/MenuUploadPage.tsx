"use client"

import { useCallback, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ImageUp,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { imageToBase64 } from "@/lib/image-to-base64"
import { MOCK_MENU } from "@/lib/mock-menu"
import { getTranslations } from "@/lib/ui-translations"
import { getLanguageOption } from "@/lib/translation-languages"
import { cn } from "@/lib/utils"
import { analyzeMenuImage } from "@/services/analyze-menu"
import type { MenuData, TranslationLanguage } from "@/types/menu"

import { LanguageSettingsDrawer } from "./LanguageSettingsDrawer"

interface MenuUploadPageProps {
  onMenuAnalyzed: (data: MenuData) => void
  language: TranslationLanguage
  onLanguageChange: (lang: TranslationLanguage) => void
}

type UploadState = "idle" | "preview" | "analyzing"

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

function validateFile(
  file: File,
  errors: ReturnType<typeof getTranslations>["upload"]["errors"],
): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "unknown"
    return errors.unsupportedFormat(ext)
  }
  if (file.size > 20 * 1024 * 1024) {
    return errors.fileTooLarge
  }
  return null
}

export function MenuUploadPage({
  onMenuAnalyzed,
  language,
  onLanguageChange,
}: MenuUploadPageProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageData, setImageData] = useState<{
    base64: string
    mimeType: string
    name: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const t = getTranslations(language)
  const currentLang = getLanguageOption(language)

  const processFile = useCallback(
    async (file: File) => {
      setError(null)
      const validationError = validateFile(file, t.upload.errors)
      if (validationError) {
        setError(validationError)
        return
      }
      try {
        const [url, data] = await Promise.all([
          Promise.resolve(URL.createObjectURL(file)),
          imageToBase64(file),
        ])
        setPreviewUrl(url)
        setImageData({ ...data, name: file.name })
        setUploadState("preview")
      } catch {
        setError(t.upload.errors.couldNotRead)
      }
    },
    [t.upload.errors],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      void processFile(file)
      e.target.value = ""
    },
    [processFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      void processFile(file)
    },
    [processFile],
  )

  const handleClear = useCallback(() => {
    setPreviewUrl(null)
    setImageData(null)
    setError(null)
    setUploadState("idle")
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }, [])

  const analyzeWithImage = useCallback(async () => {
    if (!imageData) return
    setError(null)
    setUploadState("analyzing")
    try {
      const result = await analyzeMenuImage({
        base64: imageData.base64,
        mimeType: imageData.mimeType,
        sourceImageName: imageData.name,
        targetLanguage: language,
      })
      onMenuAnalyzed(result)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t.upload.errors.analysisFailed
      setError(message)
      setUploadState("preview")
    }
  }, [imageData, language, onMenuAnalyzed, t.upload.errors.analysisFailed])

  const runDemo = useCallback(() => {
    setPreviewUrl(null)
    setImageData(null)
    setError(null)
    setUploadState("analyzing")
    window.setTimeout(() => {
      onMenuAnalyzed(MOCK_MENU)
    }, 1200)
  }, [onMenuAnalyzed])

  return (
    <>
      <div className="flex flex-col gap-6 px-4 pb-10 pt-7">
        {/* Hero heading */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className="h-auto gap-1.5 px-3 py-1 text-xs font-semibold"
            >
              <Sparkles className="size-3 text-primary" aria-hidden="true" />
              {t.upload.badge}
            </Badge>

            {/* Settings button — language selection */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex size-9 items-center justify-center gap-1.5 rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Translation language: ${currentLang.nativeLabel}. Tap to change.`}
            >
              <span className="text-sm leading-none" aria-hidden="true">
                {currentLang.flag}
              </span>
            </button>
          </div>

          <div>
            <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight">
              {t.upload.headingLine1}
              <br />
              {t.upload.headingLine2}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t.upload.subheadingBefore}
              <span className="font-medium text-foreground">
                {currentLang.nativeLabel}
              </span>
              {t.upload.subheadingAfter}
            </p>
          </div>
        </div>

        {/* Validation / API error */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              role="alert"
            >
              <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="mt-1 text-xs text-destructive/70 underline underline-offset-2 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {t.upload.dismiss}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload zone / preview */}
        <AnimatePresence mode="wait">
          {uploadState === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Card className="py-0">
                <CardContent className="space-y-2 p-3">
                  <motion.button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    animate={isDragging ? { scale: 1.015 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "flex h-40 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isDragging
                        ? "border-primary bg-primary/8 text-foreground"
                        : "border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
                    )}
                    aria-label="Upload menu photo — click or drag and drop"
                  >
                    <div
                      className={cn(
                        "rounded-xl p-3 shadow-sm transition-colors",
                        isDragging ? "bg-primary/10" : "bg-background",
                      )}
                    >
                      <ImageUp
                        className={cn(
                          "size-6 transition-colors",
                          isDragging && "text-primary",
                        )}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {isDragging
                          ? t.upload.dropToUpload
                          : t.upload.uploadMenuPhoto}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {isDragging
                          ? t.upload.fileTypesDragging
                          : t.upload.fileTypesNormal}
                      </p>
                    </div>
                  </motion.button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full gap-2"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="size-4" aria-hidden="true" />
                    {t.upload.takePhoto}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {(uploadState === "preview" || uploadState === "analyzing") &&
            previewUrl && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <Card className="overflow-hidden py-0">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Selected menu"
                      className="w-full object-cover"
                      style={{ maxHeight: 240 }}
                    />
                    {uploadState === "preview" && (
                      <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        aria-label="Remove photo"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                    {uploadState === "analyzing" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm">
                        <LoaderCircle
                          className="size-10 animate-spin text-white"
                          aria-hidden="true"
                        />
                        <p className="text-sm font-semibold text-white">
                          {t.upload.translatingMenu}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Skeleton loading */}
        <AnimatePresence>
          {uploadState === "analyzing" && (
            <motion.div
              key="skeletons"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {t.upload.extractingDishes}
              </p>
              {[100, 88, 74, 60].map((w) => (
                <Skeleton
                  key={w}
                  className="h-14 rounded-xl"
                  style={{ width: `${w}%` }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyze CTA */}
        <AnimatePresence>
          {uploadState === "preview" && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Button
                type="button"
                className="h-12 w-full gap-2 text-[15px] font-semibold"
                onClick={() => void analyzeWithImage()}
              >
                <Sparkles className="size-4" aria-hidden="true" />
                {t.upload.translateMenu}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips + demo shortcut */}
        {uploadState === "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="space-y-3"
          >
            <Card size="sm">
              <CardContent>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t.upload.forBestResults}
                </p>
                <ul className="space-y-2">
                  {t.upload.tips.map((tip) => (
                    <li
                      key={tip}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2
                        className="mt-0.5 size-3.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full text-sm text-muted-foreground"
              onClick={runDemo}
            >
              {t.upload.skipDemo}
            </Button>
          </motion.div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload menu photo from library"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Take a photo with camera"
        />
      </div>

      {/* Language settings drawer — outside scroll container */}
      <LanguageSettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        value={language}
        onChange={onLanguageChange}
      />
    </>
  )
}
