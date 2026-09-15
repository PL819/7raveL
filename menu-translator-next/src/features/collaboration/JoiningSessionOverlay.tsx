"use client"

import { motion } from "framer-motion"
import { AlertCircle, ArrowLeft, LoaderCircle, RotateCw, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UITranslations } from "@/lib/ui-translations"
import type { SessionConnectionStatus } from "@/types/session"

interface JoiningSessionOverlayProps {
  sessionId: string
  t: UITranslations
  status?: SessionConnectionStatus
  errorMessage?: string | null
  onDismiss?: () => void
  onRetry?: () => void
}

export function JoiningSessionOverlay({
  sessionId,
  t,
  status = "connecting",
  errorMessage,
  onDismiss,
  onRetry,
}: JoiningSessionOverlayProps) {
  const isError = status === "error"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 p-6 backdrop-blur-md"
    >
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        {isError ? (
          <>
            {/* Error Icon */}
            <div className="relative mb-6 flex size-20 items-center justify-center rounded-3xl bg-destructive/10 shadow-inner">
              <AlertCircle className="size-10 text-destructive" aria-hidden="true" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Unable to Join Table
            </h2>

            <p className="mt-2 text-balance text-sm text-muted-foreground">
              {errorMessage || "This table order could not be found or has expired."}
            </p>

            <div className="mt-5 flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3.5 py-1.5 text-xs text-muted-foreground">
              <span>{t.collaboration.roomCode}:</span>
              <span className="font-mono font-bold tracking-wider text-foreground">
                {sessionId}
              </span>
            </div>

            <div className="mt-6 flex w-full flex-col gap-2.5">
              {onRetry && (
                <Button
                  type="button"
                  onClick={onRetry}
                  className="h-11 w-full gap-2 text-sm font-semibold"
                >
                  <RotateCw className="size-4" />
                  Try Again
                </Button>
              )}

              {onDismiss && (
                <Button
                  type="button"
                  variant={onRetry ? "outline" : "default"}
                  onClick={onDismiss}
                  className="h-11 w-full gap-2 text-sm font-semibold"
                >
                  <ArrowLeft className="size-4" />
                  Back to Home
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Animated Brand Icon */}
            <div className="relative mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10 shadow-inner">
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <UtensilsCrossed className="size-10 text-primary" aria-hidden="true" />
              </motion.div>

              <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-background shadow-xs">
                <LoaderCircle className="size-4 animate-spin text-primary" />
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {t.collaboration.joiningSession}
            </h2>

            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {t.collaboration.syncingMenu}
            </p>

            <div className="mt-6 flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3.5 py-1.5 text-xs text-muted-foreground">
              <span>{t.collaboration.roomCode}:</span>
              <span className="font-mono font-bold tracking-wider text-foreground">
                {sessionId}
              </span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
