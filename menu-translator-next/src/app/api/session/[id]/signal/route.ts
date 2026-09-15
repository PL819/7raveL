import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/session/session-store"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await request.json().catch(() => null)

    if (!body || !body.fromPeerId || !body.toPeerId || !body.type) {
      return NextResponse.json(
        { message: "Invalid signal payload. Requires fromPeerId, toPeerId, and type." },
        { status: 400 },
      )
    }

    const ok = sessionStore.pushSignal(id, body)
    if (!ok) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to push signal"
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
    const peerId = searchParams.get("peerId")

    if (!peerId) {
      return NextResponse.json({ message: "peerId query param is required" }, { status: 400 })
    }

    const session = sessionStore.getSession(id)
    if (!session) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }

    const signals = sessionStore.pollSignals(id, peerId)
    return NextResponse.json({
      signals,
      peerCount: session.peers.size + 1,
      cartVersion: session.cartVersion,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to poll signals"
    return NextResponse.json({ message }, { status: 500 })
  }
}
