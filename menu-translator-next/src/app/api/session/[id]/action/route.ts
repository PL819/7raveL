import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/session/session-store"
import type { CartActionMessage } from "@/types/session"

export const dynamic = "force-dynamic"

/**
 * POST /api/session/[id]/action
 *
 * Receives a CartActionMessage from any participant and applies it
 * atomically to the authoritative cart state in Redis.
 * Returns the updated cart so the sender can immediately reflect the change.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await request.json().catch(() => null)

    if (!body || body.type !== "CART_ACTION" || !body.actionId) {
      return NextResponse.json(
        { message: "Invalid action payload. Requires type=CART_ACTION with actionId." },
        { status: 400 },
      )
    }

    const action = body as CartActionMessage
    const result = await sessionStore.applyCartAction(id, action)

    if (!result) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({
      cartItems: result.cartItems,
      cartVersion: result.cartVersion,
      notification: result.notification,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply action"
    return NextResponse.json({ message }, { status: 500 })
  }
}
