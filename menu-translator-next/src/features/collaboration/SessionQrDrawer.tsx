"use client"

import { useState } from "react"
import { Check, Copy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { QRCode } from "@/components/ui/qr-code"
import type { UITranslations } from "@/lib/ui-translations"

interface SessionQrDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  joinUrl: string
  peerCount: number
  isHost?: boolean
  t: UITranslations
}

export function SessionQrDrawer({
  open,
  onOpenChange,
  sessionId,
  joinUrl,
  peerCount,
  t,
}: SessionQrDrawerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(joinUrl)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = joinUrl
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy join URL:", err)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md px-6 pb-8 pt-2">
        <DrawerHeader className="px-0 pb-3 text-center">
          <DrawerTitle className="text-xl font-bold">
            {t.collaboration.scanToJoin}
          </DrawerTitle>
          <p className="mt-1 text-balance text-sm text-muted-foreground">
            {t.collaboration.scanInstructions}
          </p>
        </DrawerHeader>

        {/* QR Code Container */}
        <div className="my-2 flex flex-col items-center justify-center">
          <div className="relative rounded-2xl border-2 border-border/80 bg-white p-4 shadow-md">
            <QRCode
              value={joinUrl}
              size={210}
              color="#0f172a"
              backgroundColor="#ffffff"
            />
          </div>

          {/* Table Code Pill */}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.collaboration.roomCode}:
            </span>
            <span className="font-mono text-base font-bold tracking-widest text-primary">
              {sessionId}
            </span>
          </div>
        </div>

        {/* Live Diners Status */}
        <div className="my-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <Users className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="font-medium">
            {peerCount > 1
              ? t.collaboration.dinersCount(peerCount)
              : t.collaboration.waitingForGuests}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2 text-sm font-medium"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="size-4 text-emerald-600" aria-hidden="true" />
                <span>{t.collaboration.copied}</span>
              </>
            ) : (
              <>
                <Copy className="size-4" aria-hidden="true" />
                <span>{t.collaboration.copyLink}</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full text-sm text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            {t.collaboration.close}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
