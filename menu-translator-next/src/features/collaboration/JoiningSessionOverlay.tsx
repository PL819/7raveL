"use client"

import { motion } from "framer-motion"
import { LoaderCircle, UtensilsCrossed } from "lucide-react"
import type { UITranslations } from "@/lib/ui-translations"

interface JoiningSessionOverlayProps {
  sessionId: string
  t: UITranslations
}

export function JoiningSessionOverlay({
  sessionId,
  t,
}: JoiningSessionOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 p-6 backdrop-blur-md"
    >
      <div className="flex flex-col items-center text-center">
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

        <h2 className="text-xl font-bold tracking-tight">
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
      </div>
    </motion.div>
  )
}
