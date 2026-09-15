import { Redis } from "@upstash/redis"
import type { CartItem, MenuData, MenuItem } from "@/types/menu"
import type {
  CartActionMessage,
  CartSyncMessage,
  SessionPeerInfo,
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

class SessionStore {
  private getSessionKey(id: string): string {
    return `session:${id.toUpperCase().trim()}`
  }

  private getDedupKey(id: string, actionId: string): string {
    return `session:${id.toUpperCase().trim()}:dedup:${actionId}`
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
    let existing = await this.getSession(id)
    while (existing) {
      id = this.generateRoomCode()
      existing = await this.getSession(id)
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

    await redis.set(this.getSessionKey(id), session, { ex: EXPIRY_SECONDS })
    return session
  }

  public async getSession(id: string): Promise<ServerSessionRecord | undefined> {
    const cleanId = id.toUpperCase().trim()

    try {
      const session = await redis.get<ServerSessionRecord>(this.getSessionKey(cleanId))
      return session ?? undefined
    } catch (err) {
      console.error("[SessionStore] Redis getSession error:", err)
      return undefined
    }
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
    }
    session.lastActiveAt = Date.now()

    try {
      await redis.set(this.getSessionKey(cleanId), session, { ex: EXPIRY_SECONDS })
    } catch (err) {
      console.error("[SessionStore] Redis joinSession set failed:", err)
      return { success: false, error: "Failed to persist join." }
    }

    return { success: true, session }
  }

  /**
   * Atomically apply a cart action (ADD or DECREMENT) server-side.
   * Returns the updated cart state, or null if session not found.
   * Deduplicates by actionId to prevent double-processing.
   */
  public async applyCartAction(
    sessionId: string,
    action: CartActionMessage,
  ): Promise<{ cartItems: CartItem[]; cartVersion: number; notification?: CartSyncMessage["notification"] } | null> {
    const cleanId = sessionId.toUpperCase().trim()

    // Deduplication: SET NX returns truthy only if the key was newly created
    if (action.actionId) {
      try {
        const isNew = await redis.set(this.getDedupKey(cleanId, action.actionId), 1, {
          ex: 60, // 60-second dedup window
          nx: true,
        })
        if (!isNew) {
          // Already processed this action — return current state
          const session = await this.getSession(cleanId)
          if (!session) return null
          return { cartItems: session.cartItems, cartVersion: session.cartVersion }
        }
      } catch (err) {
        console.warn("[SessionStore] Dedup check failed, processing anyway:", err)
      }
    }

    const session = await this.getSession(cleanId)
    if (!session) return null

    let cartItems = [...session.cartItems]
    let notification: CartSyncMessage["notification"] | undefined

    if (action.action === "ADD" && action.item) {
      const existingIndex = cartItems.findIndex((ci) => ci.item.id === action.item!.id)
      if (existingIndex >= 0) {
        cartItems = cartItems.map((ci, idx) =>
          idx === existingIndex ? { ...ci, quantity: ci.quantity + 1 } : ci,
        )
      } else {
        cartItems = [...cartItems, { item: action.item, quantity: 1 }]
      }
      notification = {
        senderName: action.senderName,
        action: "added",
        itemName: action.item.translatedName,
      }
    } else if (action.action === "DECREMENT" && action.itemId) {
      const target = cartItems.find((ci) => ci.item.id === action.itemId)
      if (target) {
        if (target.quantity > 1) {
          cartItems = cartItems.map((ci) =>
            ci.item.id === action.itemId ? { ...ci, quantity: ci.quantity - 1 } : ci,
          )
        } else {
          cartItems = cartItems.filter((ci) => ci.item.id !== action.itemId)
        }
        notification = {
          senderName: action.senderName,
          action: "removed",
          itemName: target.item.translatedName,
        }
      }
    }

    const newVersion = session.cartVersion + 1
    session.cartItems = cartItems
    session.cartVersion = newVersion
    session.lastActiveAt = Date.now()

    try {
      await redis.set(this.getSessionKey(cleanId), session, { ex: EXPIRY_SECONDS })
    } catch (err) {
      console.error("[SessionStore] Failed to persist cart update:", err)
    }

    return { cartItems, cartVersion: newVersion, notification }
  }

  /**
   * Returns the current cart state if the version is newer than `sinceVersion`.
   * Returns null if no update is available.
   */
  public async getCartSync(
    sessionId: string,
    sinceVersion: number,
  ): Promise<{
    cartItems: CartItem[]
    cartVersion: number
    peerCount: number
    peerNames: string[]
  } | null> {
    const cleanId = sessionId.toUpperCase().trim()
    const session = await this.getSession(cleanId)
    if (!session) return null

    const peerCount = Object.keys(session.peers).length + 1 // +1 for host
    const peerNames = [session.hostName, ...Object.values(session.peers).map((p) => p.name)]

    if (session.cartVersion > sinceVersion) {
      return {
        cartItems: session.cartItems,
        cartVersion: session.cartVersion,
        peerCount,
        peerNames,
      }
    }

    // No cart change, but still return presence info
    return {
      cartItems: session.cartItems,
      cartVersion: session.cartVersion,
      peerCount,
      peerNames,
    }
  }

  public async destroySession(id: string): Promise<void> {
    const cleanId = id.toUpperCase().trim()
    try {
      await redis.del(this.getSessionKey(cleanId))
    } catch (err) {
      console.warn("[SessionStore] Redis destroySession error:", err)
    }
  }
}

export const sessionStore = new SessionStore()
