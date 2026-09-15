"use client"

import { motion } from "framer-motion"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SessionConnectionStatus } from "@/types/session"

interface SessionStatusBadgeProps {
  status: SessionConnectionStatus
  peerCount: number
  onClick?: () => void
  label?: string
  className?: string
}

export function SessionStatusBadge({
  status,
  peerCount,
  onClick,
  label,
  className,
}: SessionStatusBadgeProps) {
  const isConnected = status === "connected"
  const isConnecting = status === "connecting" || status === "creating"

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isConnected
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300"
          : isConnecting
            ? "border-amber-500/30 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300"
            : "border-border bg-muted text-muted-foreground",
        className,
      )}
      aria-label={`Collaborative session: ${peerCount} diners connected. Tap to view QR code.`}
    >
      <span className="relative flex size-2 shrink-0">
        {isConnected && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            isConnected
              ? "bg-emerald-500"
              : isConnecting
                ? "animate-pulse bg-amber-500"
                : "bg-muted-foreground",
          )}
        />
      </span>

      <Users className="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
      <span className="tabular-nums">
        {label || (peerCount > 1 ? `${peerCount} diners` : "1 diner")}
      </span>
    </motion.button>
  )
}
