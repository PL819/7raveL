import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/session/session-store"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const hostPeerId = body.hostPeerId || "host-" + Math.random().toString(36).slice(2, 9)
    const hostName = body.hostName || "Host"

    const menuData = body.menuData
    const initialCart = body.initialCart || []

    const session = await sessionStore.createSession(hostPeerId, hostName, menuData, initialCart)

    return NextResponse.json({
      sessionId: session.id,
      hostPeerId: session.hostPeerId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create session"
    return NextResponse.json({ message }, { status: 500 })
  }
}
