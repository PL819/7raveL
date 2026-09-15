import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/session/session-store"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const peerId = body.peerId
    const peerName = body.peerName || "Guest"

    if (!peerId) {
      return NextResponse.json({ message: "peerId is required" }, { status: 400 })
    }

    const result = await sessionStore.joinSession(id, peerId, peerName)
    if (!result.success || !result.session) {
      return NextResponse.json(
        { message: result.error || "Failed to join session" },
        { status: 404 },
      )
    }

    return NextResponse.json({
      sessionId: result.session.id,
      hostPeerId: result.session.hostPeerId,
      hostName: result.session.hostName,
      menuData: result.session.menuData,
      cartItems: result.session.cartItems,
      cartVersion: result.session.cartVersion,
      peerCount: Object.keys(result.session.peers).length + 1, // Host + all peers
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join session"
    return NextResponse.json({ message }, { status: 500 })
  }
}
