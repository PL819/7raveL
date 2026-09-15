import type { CartItem, MenuData } from "@/types/menu"
import type {
  CartActionMessage,
  CartSyncMessage,
  SessionPeerInfo,
  SignalingMessage,
} from "@/types/session"
import { generateId } from "@/lib/generate-id"

export interface ServerSessionRecord {
  id: string
  hostPeerId: string
  hostName: string
  menuData?: MenuData
  cartItems: CartItem[]
  cartVersion: number
  peers: Map<string, SessionPeerInfo>
  signalQueues: Map<string, SignalingMessage[]>
  // Fallback relay queue for cart actions when WebRTC is blocked
  relayCartActions: CartActionMessage[]
  relayCartSyncs: CartSyncMessage[]
  createdAt: number
  lastActiveAt: number
}

class SessionStore {
  private sessions = new Map<string, ServerSessionRecord>()

  private generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Exclude confusing chars I, O, 1, 0
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    // Ensure uniqueness
    if (this.sessions.has(code)) {
      return this.generateRoomCode()
    }
    return code
  }

  public createSession(hostPeerId: string, hostName = "Host"): ServerSessionRecord {
    this.cleanupStaleSessions()

    const id = this.generateRoomCode()
    const now = Date.now()

    const session: ServerSessionRecord = {
      id,
      hostPeerId,
      hostName,
      cartItems: [],
      cartVersion: 0,
      peers: new Map(),
      signalQueues: new Map(),
      relayCartActions: [],
      relayCartSyncs: [],
      createdAt: now,
      lastActiveAt: now,
    }

    // Host signal mailbox
    session.signalQueues.set(hostPeerId, [])
    this.sessions.set(id, session)
    return session
  }

  public getSession(id: string): ServerSessionRecord | undefined {
    const session = this.sessions.get(id.toUpperCase().trim())
    if (session) {
      session.lastActiveAt = Date.now()
    }
    return session
  }

  public joinSession(
    sessionId: string,
    peerId: string,
    peerName = "Guest",
  ): { success: boolean; session?: ServerSessionRecord; error?: string } {
    const session = this.getSession(sessionId)
    if (!session) {
      return { success: false, error: "Session not found or has expired." }
    }

    // Register guest
    session.peers.set(peerId, {
      peerId,
      name: peerName,
      joinedAt: Date.now(),
      transport: "webrtc",
    })

    if (!session.signalQueues.has(peerId)) {
      session.signalQueues.set(peerId, [])
    }

    // Push notification to host that a new peer joined
    this.pushSignal(sessionId, {
      id: generateId(),
      sessionId,
      fromPeerId: peerId,
      toPeerId: session.hostPeerId,
      type: "peer_joined",
      peerName,
      timestamp: Date.now(),
    })

    return { success: true, session }
  }

  public pushSignal(
    sessionId: string,
    signal: Omit<SignalingMessage, "id" | "timestamp"> & {
      id?: string
      timestamp?: number
    },
  ): boolean {
    const session = this.getSession(sessionId)
    if (!session) return false

    const queue = session.signalQueues.get(signal.toPeerId)
    if (!queue) {
      session.signalQueues.set(signal.toPeerId, [])
    }

    const fullSignal: SignalingMessage = {
      id: signal.id ?? generateId(),
      timestamp: signal.timestamp ?? Date.now(),
      sessionId,
      fromPeerId: signal.fromPeerId,
      toPeerId: signal.toPeerId,
      type: signal.type,
      sdp: signal.sdp,
      candidate: signal.candidate,
      peerName: signal.peerName,
    }

    session.signalQueues.get(signal.toPeerId)?.push(fullSignal)
    session.lastActiveAt = Date.now()
    return true
  }

  public pollSignals(sessionId: string, peerId: string): SignalingMessage[] {
    const session = this.getSession(sessionId)
    if (!session) return []

    const queue = session.signalQueues.get(peerId)
    if (!queue || queue.length === 0) return []

    // Drain pending signals
    const signals = [...queue]
    session.signalQueues.set(peerId, [])
    session.lastActiveAt = Date.now()
    return signals
  }

  // Fallback HTTP relay for cart actions
  public pushRelayCartAction(sessionId: string, action: CartActionMessage): boolean {
    const session = this.getSession(sessionId)
    if (!session) return false
    session.relayCartActions.push(action)
    // Keep max 50 recent actions
    if (session.relayCartActions.length > 50) {
      session.relayCartActions.shift()
    }
    return true
  }

  public pollRelayCartActions(sessionId: string): CartActionMessage[] {
    const session = this.getSession(sessionId)
    if (!session) return []
    const actions = [...session.relayCartActions]
    session.relayCartActions = []
    return actions
  }

  public pushRelayCartSync(sessionId: string, sync: CartSyncMessage): boolean {
    const session = this.getSession(sessionId)
    if (!session) return false
    session.cartItems = sync.cartItems
    session.cartVersion = sync.cartVersion
    session.relayCartSyncs.push(sync)
    if (session.relayCartSyncs.length > 20) {
      session.relayCartSyncs.shift()
    }
    return true
  }

  public pollRelayCartSyncs(sessionId: string, lastVersion: number): CartSyncMessage | null {
    const session = this.getSession(sessionId)
    if (!session) return null
    if (session.cartVersion > lastVersion) {
      return {
        type: "CART_SYNC",
        cartItems: session.cartItems,
        cartVersion: session.cartVersion,
      }
    }
    return null
  }

  private cleanupStaleSessions(): void {
    const now = Date.now()
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000

    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActiveAt > TWO_HOURS_MS) {
        this.sessions.delete(id)
      }
    }
  }
}

// Preserve session store on globalThis for Next.js hot module reload in development
const globalForSession = globalThis as unknown as {
  __sharedSessionStore?: SessionStore
}

export const sessionStore =
  globalForSession.__sharedSessionStore ?? new SessionStore()

if (process.env.NODE_ENV !== "production") {
  globalForSession.__sharedSessionStore = sessionStore
}
