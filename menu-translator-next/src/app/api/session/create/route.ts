import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/session/session-store"
import { getLocalIpAddress } from "@/lib/session/get-local-ip"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const hostPeerId = body.hostPeerId || "host-" + Math.random().toString(36).slice(2, 9)
    const hostName = body.hostName || "Host"

    const menuData = body.menuData
    const initialCart = body.initialCart || []

    const session = await sessionStore.createSession(hostPeerId, hostName, menuData, initialCart)
    const localIp = getLocalIpAddress()

    // Determine origin from request or local IP
    const hostHeader = request.headers.get("host") || "localhost:3000"
    const protocol = request.headers.get("x-forwarded-proto") || "http"

    // Construct local Wi-Fi join URL
    const port = hostHeader.includes(":") ? hostHeader.split(":")[1] : "3000"
    const wifiJoinUrl = `${protocol}://${localIp}:${port}/?session=${session.id}`
    const currentOriginJoinUrl = `${protocol}://${hostHeader}/?session=${session.id}`

    return NextResponse.json({
      sessionId: session.id,
      hostPeerId: session.hostPeerId,
      menuData: session.menuData,
      localIp,
      joinUrl: wifiJoinUrl,
      currentOriginJoinUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create session"
    return NextResponse.json({ message }, { status: 500 })
  }
}
