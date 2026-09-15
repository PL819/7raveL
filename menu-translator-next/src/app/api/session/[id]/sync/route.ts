import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/session/session-store"

export const dynamic = "force-dynamic"

/**
 * GET /api/session/[id]/sync?version=N
 *
 * Polled by all participants at ~1s intervals.
 * Returns the current authoritative cart state + peer presence info.
 * Clients use `cartVersion` to detect changes and re-render only when needed.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const sinceVersion = parseInt(searchParams.get("version") || "0", 10)

    const result = await sessionStore.getCartSync(id, sinceVersion)

    if (!result) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({
      cartItems: result.cartItems,
      cartVersion: result.cartVersion,
      peerCount: result.peerCount,
      peerNames: result.peerNames,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync"
    return NextResponse.json({ message }, { status: 500 })
  }
}
