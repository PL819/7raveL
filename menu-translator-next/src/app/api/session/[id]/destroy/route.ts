import { NextRequest, NextResponse } from "next/server"
import { sessionStore } from "@/lib/session/session-store"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await sessionStore.destroySession(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ message: "Failed to destroy session" }, { status: 500 })
  }
}
