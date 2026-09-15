"use client"

import { useMemo } from "react"
import { generateQrMatrix } from "@/lib/qr-matrix"
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
  color = "currentColor",
  backgroundColor = "transparent",
}: QRCodeProps) {
  const { path, matrixSize } = useMemo(() => {
    if (!value) return { path: "", matrixSize: 21 }

    try {
      const matrix = generateQrMatrix(value)
      const matrixSize = matrix.length
      const quietZone = 2
      let pathStr = ""

      for (let r = 0; r < matrixSize; r++) {
        for (let c = 0; c < matrixSize; c++) {
          if (matrix[r][c]) {
            const x = c + quietZone
            const y = r + quietZone
            pathStr += `M${x},${y}h1v1h-1z `
          }
        }
      }

      return { path: pathStr, matrixSize: matrixSize + quietZone * 2 }
    } catch (err) {
      console.error("[QRCode] Failed to generate matrix:", err)
      return { path: "", matrixSize: 21 }
    }
  }, [value])

  if (!path) {
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
    <svg
      viewBox={`0 0 ${matrixSize} ${matrixSize}`}
      width={size}
      height={size}
      className={cn("shape-rendering-crisp-edges", className)}
      style={{ shapeRendering: "crispEdges" }}
      aria-label={`QR Code for ${value}`}
      role="img"
    >
      {backgroundColor !== "transparent" && (
        <rect width={matrixSize} height={matrixSize} fill={backgroundColor} />
      )}
      <path d={path} fill={color} />
    </svg>
  )
}
