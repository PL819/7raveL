import { Redis } from "@upstash/redis"
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
  createdAt: number
  lastActiveAt: number
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "https://perfect-guppy-99316.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "gQAAAAAAAYP0AAIgcDIwMmRlNTYzYzY5MTc0ZTdlYWVjYjQ4N2I5OGE2NTFmZQ",
})

const EXPIRY_SECONDS = 3 * 60 * 60 // 3 hours
const MEMORY_CACHE_TTL_MS = 2000 // 2-second in-memory cache to mitigate parallel read floods

interface MemorySessionState {
  session: ServerSessionRecord
  cachedAt: number
}

class SessionStore {
  // In-memory fallback and short-term read cache
  private memorySessions = new Map<string, MemorySessionState>()
  private memorySignalQueues = new Map<string, SignalingMessage[]>()
  private memoryRelayActions = new Map<string, CartActionMessage[]>()
  private memoryRelaySyncs = new Map<string, CartSyncMessage>()

  private getSessionKey(id: string): string {
    return `session:${id.toUpperCase().trim()}`
  }

  private getSignalKey(id: string, peerId: string): string {
    return `session:${id.toUpperCase().trim()}:sig:${peerId}`
  }

  private getActionsKey(id: string): string {
    return `session:${id.toUpperCase().trim()}:actions`
  }

  private getCartKey(id: string): string {
    return `session:${id.toUpperCase().trim()}:cart`
  }

  private generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Exclude confusing chars I, O, 1, 0
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  public async createSession(
    hostPeerId: string,
    hostName = "Host",
    menuData?: MenuData,
    initialCart: CartItem[] = [],
  ): Promise<ServerSessionRecord> {
    let id = this.generateRoomCode()

    // Check collision
    let existing = await this.getSession(id).catch(() => undefined)
    while (existing) {
      id = this.generateRoomCode()
      existing = await this.getSession(id).catch(() => undefined)
    }

    const now = Date.now()
    const session: ServerSessionRecord = {
      id,
      hostPeerId,
      hostName,
      menuData,
      cartItems: initialCart,
      cartVersion: 0,
      peers: {},
      createdAt: now,
      lastActiveAt: now,
    }

    // Save in memory
    this.memorySessions.set(id, { session, cachedAt: now })

    // Save in Redis
    try {
      const pipeline = redis.pipeline()
      pipeline.set(this.getSessionKey(id), session, { ex: EXPIRY_SECONDS })
      if (initialCart.length > 0) {
        pipeline.set(
          this.getCartKey(id),
          {
            type: "CART_SYNC",
            cartItems: initialCart,
            cartVersion: 0,
          } as CartSyncMessage,
          { ex: EXPIRY_SECONDS },
        )
      }
      await pipeline.exec()
    } catch (err) {
      console.warn("[SessionStore] Redis createSession fallback to memory:", err)
    }

    return session
  }

  public async getSession(id: string): Promise<ServerSessionRecord | undefined> {
    const cleanId = id.toUpperCase().trim()
    const now = Date.now()

    // Check short-lived in-memory cache first to avoid slamming Redis on every poll
    const cached = this.memorySessions.get(cleanId)
    if (cached && now - cached.cachedAt < MEMORY_CACHE_TTL_MS) {
      return cached.session
    }

    try {
      const session = await redis.get<ServerSessionRecord>(this.getSessionKey(cleanId))
      if (session) {
        // Important: DO NOT write back to Redis here! Pure reads should not consume write quota or cause race conditions.
        this.memorySessions.set(cleanId, { session, cachedAt: now })
        return session
      }
    } catch (err) {
      console.warn("[SessionStore] Redis getSession fallback to memory:", err)
    }

    // Fallback to in-memory store
    return cached?.session
  }

  public async joinSession(
    sessionId: string,
    peerId: string,
    peerName = "Guest",
  ): Promise<{ success: boolean; session?: ServerSessionRecord; error?: string }> {
    const cleanId = sessionId.toUpperCase().trim()
    const session = await this.getSession(cleanId)
    if (!session) {
      return { success: false, error: "Session not found or has expired." }
    }

    session.peers[peerId] = {
      peerId,
      name: peerName,
      joinedAt: Date.now(),
      transport: "webrtc",
    }
    session.lastActiveAt = Date.now()

    // Update in-memory cache immediately
    this.memorySessions.set(cleanId, { session, cachedAt: Date.now() })

    // Persist updated peers to Redis
    try {
      await redis.set(this.getSessionKey(cleanId), session, { ex: EXPIRY_SECONDS })
    } catch (err) {
      console.warn("[SessionStore] Redis joinSession set failed, relying on memory:", err)
    }

    // Notify host that guest joined
    await this.pushSignal(cleanId, {
      id: generateId(),
      sessionId: cleanId,
      fromPeerId: peerId,
      toPeerId: session.hostPeerId,
      type: "peer_joined",
      peerName,
      timestamp: Date.now(),
    })

    return { success: true, session }
  }

  public async pushSignal(
    sessionId: string,
    signal: Omit<SignalingMessage, "id" | "timestamp"> & {
      id?: string
      timestamp?: number
    },
  ): Promise<boolean> {
    const cleanId = sessionId.toUpperCase().trim()
    const fullSignal: SignalingMessage = {
      id: signal.id ?? generateId(),
      timestamp: signal.timestamp ?? Date.now(),
      sessionId: cleanId,
      fromPeerId: signal.fromPeerId,
      toPeerId: signal.toPeerId,
      type: signal.type,
      sdp: signal.sdp,
      candidate: signal.candidate,
      peerName: signal.peerName,
    }

    // Mirror to memory queue
    const memKey = `${cleanId}:${signal.toPeerId}`
    const memQueue = this.memorySignalQueues.get(memKey) || []
    memQueue.push(fullSignal)
    this.memorySignalQueues.set(memKey, memQueue)

    // Atomic push to isolated Redis list (no read-modify-write!)
    try {
      const queueKey = this.getSignalKey(cleanId, signal.toPeerId)
      const pipeline = redis.pipeline()
      pipeline.rpush(queueKey, fullSignal)
      pipeline.expire(queueKey, EXPIRY_SECONDS)
      await pipeline.exec()
      return true
    } catch (err) {
      console.warn("[SessionStore] Redis pushSignal fallback to memory:", err)
      return true
    }
  }

  public async pollSignals(sessionId: string, peerId: string): Promise<SignalingMessage[]> {
    const cleanId = sessionId.toUpperCase().trim()
    const memKey = `${cleanId}:${peerId}`
    const memSignals = this.memorySignalQueues.get(memKey) || []
    this.memorySignalQueues.set(memKey, [])

    try {
      const queueKey = this.getSignalKey(cleanId, peerId)
      const pipeline = redis.pipeline()
      pipeline.lrange(queueKey, 0, -1)
      pipeline.del(queueKey)
      const results = await pipeline.exec<[unknown[], number]>()
      const rawRedisSignals = (results?.[0] as unknown[]) || []

      // Normalize any stringified items from Redis
      const redisSignals: SignalingMessage[] = rawRedisSignals.map((item) =>
        typeof item === "string" ? (JSON.parse(item) as SignalingMessage) : (item as SignalingMessage),
      )

      // Deduplicate signals between Redis and Memory by id
      const seenIds = new Set<string>()
      const combined: SignalingMessage[] = []

      for (const sig of [...redisSignals, ...memSignals]) {
        if (!seenIds.has(sig.id)) {
          seenIds.add(sig.id)
          combined.push(sig)
        }
      }

      return combined
    } catch (err) {
      console.warn("[SessionStore] Redis pollSignals fallback to memory:", err)
      return memSignals
    }
  }

  public async pushRelayCartAction(sessionId: string, action: CartActionMessage): Promise<boolean> {
    const cleanId = sessionId.toUpperCase().trim()

    // Mirror to memory
    const memActions = this.memoryRelayActions.get(cleanId) || []
    memActions.push(action)
    if (memActions.length > 50) memActions.shift()
    this.memoryRelayActions.set(cleanId, memActions)

    // Atomic push to Redis list
    try {
      const key = this.getActionsKey(cleanId)
      const pipeline = redis.pipeline()
      pipeline.rpush(key, action)
      pipeline.expire(key, EXPIRY_SECONDS)
      await pipeline.exec()
      return true
    } catch (err) {
      console.warn("[SessionStore] Redis pushRelayCartAction fallback to memory:", err)
      return true
    }
  }

  public async pollRelayCartActions(sessionId: string): Promise<CartActionMessage[]> {
    const cleanId = sessionId.toUpperCase().trim()
    const memActions = this.memoryRelayActions.get(cleanId) || []
    this.memoryRelayActions.set(cleanId, [])

    try {
      const key = this.getActionsKey(cleanId)
      const pipeline = redis.pipeline()
      pipeline.lrange(key, 0, -1)
      pipeline.del(key)
      const results = await pipeline.exec<[unknown[], number]>()
      const rawActions = (results?.[0] as unknown[]) || []

      const redisActions: CartActionMessage[] = rawActions.map((item) =>
        typeof item === "string" ? (JSON.parse(item) as CartActionMessage) : (item as CartActionMessage),
      )

      return [...redisActions, ...memActions]
    } catch (err) {
      console.warn("[SessionStore] Redis pollRelayCartActions fallback to memory:", err)
      return memActions
    }
  }

  public async pushRelayCartSync(sessionId: string, sync: CartSyncMessage): Promise<boolean> {
    const cleanId = sessionId.toUpperCase().trim()

    // Update memory
    this.memoryRelaySyncs.set(cleanId, sync)

    const cached = this.memorySessions.get(cleanId)
    if (cached) {
      cached.session.cartItems = sync.cartItems
      cached.session.cartVersion = sync.cartVersion
    }

    try {
      await redis.set(this.getCartKey(cleanId), sync, { ex: EXPIRY_SECONDS })
      return true
    } catch (err) {
      console.warn("[SessionStore] Redis pushRelayCartSync fallback to memory:", err)
      return true
    }
  }

  public async pollRelayCartSyncs(sessionId: string, lastVersion: number): Promise<CartSyncMessage | null> {
    const cleanId = sessionId.toUpperCase().trim()

    let sync: CartSyncMessage | null = null
    try {
      sync = await redis.get<CartSyncMessage>(this.getCartKey(cleanId))
    } catch (err) {
      console.warn("[SessionStore] Redis pollRelayCartSyncs fallback to memory:", err)
    }

    if (!sync) {
      sync = this.memoryRelaySyncs.get(cleanId) || null
    }

    if (sync && sync.cartVersion > lastVersion) {
      return sync
    }

    return null
  }

  public async destroySession(id: string): Promise<void> {
    const cleanId = id.toUpperCase().trim()
    this.memorySessions.delete(cleanId)
    this.memoryRelayActions.delete(cleanId)
    this.memoryRelaySyncs.delete(cleanId)

    try {
      const pipeline = redis.pipeline()
      pipeline.del(this.getSessionKey(cleanId))
      pipeline.del(this.getActionsKey(cleanId))
      pipeline.del(this.getCartKey(cleanId))
      await pipeline.exec()
    } catch (err) {
      console.warn("[SessionStore] Redis destroySession error:", err)
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
