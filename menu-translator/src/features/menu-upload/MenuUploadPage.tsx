import { useCallback, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
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
import { MOCK_MENU } from "@/lib/mock-menu"
import type { MenuData } from "@/types/menu"

interface MenuUploadPageProps {
  onMenuAnalyzed: (data: MenuData) => void
}

type UploadState = "idle" | "preview" | "analyzing"

const TIPS = [
  "Lay the menu flat with even lighting",
  "Capture the full page or one clear section",
  "Avoid glare and heavy shadows",
]

export function MenuUploadPage({ onMenuAnalyzed }: MenuUploadPageProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setUploadState("preview")
    },
    [],
  )

  const handleClear = useCallback(() => {
    setPreviewUrl(null)
    setUploadState("idle")
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }, [])

  const startAnalysis = useCallback(
    (withPreview: boolean) => {
      if (withPreview) {
        setUploadState("analyzing")
      } else {
        setPreviewUrl(null)
        setUploadState("analyzing")
      }
      window.setTimeout(() => {
        onMenuAnalyzed(MOCK_MENU)
      }, 2000)
    },
    [onMenuAnalyzed],
  )

  return (
    <div className="flex flex-col gap-6 px-4 pb-10 pt-7">
      {/* Hero heading */}
      <div className="space-y-3">
        <Badge
          variant="secondary"
          className="h-auto gap-1.5 px-3 py-1 text-xs font-semibold"
        >
          <Sparkles className="size-3 text-primary" aria-hidden="true" />
          Menu Translator
        </Badge>
        <div>
          <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight">
            Read any menu,
            <br />
            order with confidence
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Upload or photograph a menu. We'll translate it into clear English
            in seconds.
          </p>
        </div>
      </div>

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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-40 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
                  aria-label="Upload menu photo from library"
                >
                  <div className="rounded-xl bg-background p-3 shadow-sm">
                    <ImageUp className="size-6" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload menu photo</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      JPG, PNG, WebP · up to 20 MB
                    </p>
                  </div>
                </button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="size-4" aria-hidden="true" />
                  Take a photo
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
                      className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                        Reading menu…
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
              Extracting dishes…
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
              onClick={() => startAnalysis(true)}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Analyze Menu
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
                For best results
              </p>
              <ul className="space-y-2">
                {TIPS.map((tip) => (
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
            onClick={() => startAnalysis(false)}
          >
            Skip — try with demo menu →
          </Button>
        </motion.div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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
  )
}
