import { Redis } from '@upstash/redis'
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
  peers: Record<string, SessionPeerInfo>
  signalQueues: Record<string, SignalingMessage[]>
  relayCartActions: CartActionMessage[]
  relayCartSyncs: CartSyncMessage[]
  createdAt: number
  lastActiveAt: number
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "https://perfect-guppy-99316.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "gQAAAAAAAYP0AAIgcDIwMmRlNTYzYzY5MTc0ZTdlYWVjYjQ4N2I5OGE2NTFmZQ",
})

const EXPIRY_SECONDS = 3 * 60 * 60 // 3 hours

class SessionStore {
  private getRedisKey(id: string) {
    return `session:${id.toUpperCase().trim()}`
  }

  private generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Exclude confusing chars I, O, 1, 0
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  public async createSession(hostPeerId: string, hostName = "Host"): Promise<ServerSessionRecord> {
    let id = this.generateRoomCode()
    let existing = await redis.get<ServerSessionRecord>(this.getRedisKey(id))
    while (existing) {
      id = this.generateRoomCode()
      existing = await redis.get<ServerSessionRecord>(this.getRedisKey(id))
    }

    const now = Date.now()

    const session: ServerSessionRecord = {
      id,
      hostPeerId,
      hostName,
      cartItems: [],
      cartVersion: 0,
      peers: {},
      signalQueues: {},
      relayCartActions: [],
      relayCartSyncs: [],
      createdAt: now,
      lastActiveAt: now,
    }

    session.signalQueues[hostPeerId] = []
    await redis.set(this.getRedisKey(id), session, { ex: EXPIRY_SECONDS })
    return session
  }

  public async getSession(id: string): Promise<ServerSessionRecord | undefined> {
    const session = await redis.get<ServerSessionRecord>(this.getRedisKey(id))
    if (session) {
      session.lastActiveAt = Date.now()
      // Refresh expiry time on access
      await redis.set(this.getRedisKey(id), session, { ex: EXPIRY_SECONDS })
      return session
    }
    return undefined
  }

  public async joinSession(
    sessionId: string,
    peerId: string,
    peerName = "Guest",
  ): Promise<{ success: boolean; session?: ServerSessionRecord; error?: string }> {
    const session = await this.getSession(sessionId)
    if (!session) {
      return { success: false, error: "Session not found or has expired." }
    }

    session.peers[peerId] = {
      peerId,
      name: peerName,
      joinedAt: Date.now(),
      transport: "webrtc",
    }

    if (!session.signalQueues[peerId]) {
      session.signalQueues[peerId] = []
    }

    // Save before pushing signal
    await redis.set(this.getRedisKey(sessionId), session, { ex: EXPIRY_SECONDS })

    // Push notification to host that a new peer joined
    await this.pushSignal(sessionId, {
      id: generateId(),
      sessionId,
      fromPeerId: peerId,
      toPeerId: session.hostPeerId,
      type: "peer_joined",
      peerName,
      timestamp: Date.now(),
    })

    // Fetch fresh to return
    const updatedSession = await this.getSession(sessionId)
    return { success: true, session: updatedSession! }
  }

  public async pushSignal(
    sessionId: string,
    signal: Omit<SignalingMessage, "id" | "timestamp"> & {
      id?: string
      timestamp?: number
    },
  ): Promise<boolean> {
    const session = await this.getSession(sessionId)
    if (!session) return false

    const queue = session.signalQueues[signal.toPeerId]
    if (!queue) {
      session.signalQueues[signal.toPeerId] = []
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

    session.signalQueues[signal.toPeerId]?.push(fullSignal)
    session.lastActiveAt = Date.now()
    await redis.set(this.getRedisKey(sessionId), session, { ex: EXPIRY_SECONDS })
    return true
  }

  public async pollSignals(sessionId: string, peerId: string): Promise<SignalingMessage[]> {
    const session = await this.getSession(sessionId)
    if (!session) return []

    const queue = session.signalQueues[peerId]
    if (!queue || queue.length === 0) return []

    // Drain pending signals
    const signals = [...queue]
    session.signalQueues[peerId] = []
    session.lastActiveAt = Date.now()
    await redis.set(this.getRedisKey(sessionId), session, { ex: EXPIRY_SECONDS })
    return signals
  }

  public async pushRelayCartAction(sessionId: string, action: CartActionMessage): Promise<boolean> {
    const session = await this.getSession(sessionId)
    if (!session) return false
    session.relayCartActions.push(action)
    // Keep max 50 recent actions
    if (session.relayCartActions.length > 50) {
      session.relayCartActions.shift()
    }
    await redis.set(this.getRedisKey(sessionId), session, { ex: EXPIRY_SECONDS })
    return true
  }

  public async pollRelayCartActions(sessionId: string): Promise<CartActionMessage[]> {
    const session = await this.getSession(sessionId)
    if (!session) return []
    const actions = [...session.relayCartActions]
    session.relayCartActions = []
    await redis.set(this.getRedisKey(sessionId), session, { ex: EXPIRY_SECONDS })
    return actions
  }

  public async pushRelayCartSync(sessionId: string, sync: CartSyncMessage): Promise<boolean> {
    const session = await this.getSession(sessionId)
    if (!session) return false
    session.cartItems = sync.cartItems
    session.cartVersion = sync.cartVersion
    session.relayCartSyncs.push(sync)
    if (session.relayCartSyncs.length > 20) {
      session.relayCartSyncs.shift()
    }
    await redis.set(this.getRedisKey(sessionId), session, { ex: EXPIRY_SECONDS })
    return true
  }

  public async pollRelayCartSyncs(sessionId: string, lastVersion: number): Promise<CartSyncMessage | null> {
    const session = await this.getSession(sessionId)
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

  public async destroySession(id: string): Promise<void> {
    await redis.del(this.getRedisKey(id))
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
