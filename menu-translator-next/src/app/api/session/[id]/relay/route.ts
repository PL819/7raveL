import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/session/session-store"
import type { CartActionMessage, CartSyncMessage } from "@/types/session"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await request.json().catch(() => null)

    if (!body || !body.type) {
      return NextResponse.json({ message: "Invalid relay payload" }, { status: 400 })
    }

    if (body.type === "CART_ACTION") {
      const ok = sessionStore.pushRelayCartAction(id, body as CartActionMessage)
      if (!ok) return NextResponse.json({ message: "Session not found" }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    if (body.type === "CART_SYNC") {
      const ok = sessionStore.pushRelayCartSync(id, body as CartSyncMessage)
      if (!ok) return NextResponse.json({ message: "Session not found" }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ message: "Unsupported relay message type" }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to relay message"
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role") || "guest"
    const lastVersion = parseInt(searchParams.get("version") || "0", 10)

    const session = sessionStore.getSession(id)
    if (!session) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }

    if (role === "host") {
      // Host drains pending guest cart actions
      const actions = sessionStore.pollRelayCartActions(id)
      return NextResponse.json({ actions })
    } else {
      // Guests check for latest authoritative cart sync
      const sync = sessionStore.pollRelayCartSyncs(id, lastVersion)
      return NextResponse.json({
        sync,
        peerCount: session.peers.size + 1,
        cartVersion: session.cartVersion,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get relay messages"
    return NextResponse.json({ message }, { status: 500 })
  }
}
