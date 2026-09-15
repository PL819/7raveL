"use client"

import { useEffect, useState } from "react"
import QRCodeLib from "qrcode"
import { cn } from "@/lib/utils"

interface QRCodeProps {
  value: string
  size?: number
  className?: string
  color?: string
  backgroundColor?: string
}

export function QRCode({
  value,
  size = 220,
  className,
  color = "#0f172a",
  backgroundColor = "#ffffff",
}: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setDataUrl(null)
      return
    }

    QRCodeLib.toDataURL(value, {
      width: size * 2, // 2x for retina sharpness
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: color, light: backgroundColor },
    })
      .then(setDataUrl)
      .catch((err) => {
        console.error("[QRCode] Failed to generate:", err)
        setDataUrl(null)
      })
  }, [value, size, color, backgroundColor])

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground",
          className,
        )}
      >
        Generating QR…
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt={`QR Code for ${value}`}
      width={size}
      height={size}
      className={cn("rounded", className)}
      style={{ imageRendering: "pixelated" }}
    />
  )
}
