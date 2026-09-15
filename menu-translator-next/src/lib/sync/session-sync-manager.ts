import type { CartItem, MenuItem } from "@/types/menu"
import type { CartActionMessage, CartSyncMessage } from "@/types/session"
import { generateId } from "@/lib/generate-id"

export interface SyncManagerCallbacks {
  onCartSync: (cartItems: CartItem[], version: number) => void
  onPeerCountChange: (peerCount: number) => void
  onStatusChange: (
    status: "connecting" | "connected" | "disconnected" | "error",
    errorMessage?: string,
  ) => void
  onToastNotification?: (message: string) => void
}

/**
 * Unified session sync manager used by both host and guest roles.
 * Communicates with the server via REST endpoints:
 *   - POST /api/session/{id}/action  → submit cart mutations
 *   - GET  /api/session/{id}/sync    → poll for authoritative state
 *
 * The server (Redis) is the single source of truth for cart state.
 */
export class SessionSyncManager {
  public sessionId: string
  public peerId: string
  public peerName: string

  private cartVersion = 0
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private isDestroyed = false
  private isPolling = false
  private callbacks: SyncManagerCallbacks
  private consecutiveErrors = 0
  private static readonly MAX_CONSECUTIVE_ERRORS = 10

  constructor(opts: {
    sessionId: string
    peerId: string
    peerName: string
    initialCartVersion?: number
    callbacks: SyncManagerCallbacks
  }) {
    this.sessionId = opts.sessionId.toUpperCase().trim()
    this.peerId = opts.peerId
    this.peerName = opts.peerName
    this.cartVersion = opts.initialCartVersion ?? 0
    this.callbacks = opts.callbacks
  }

  /** Start polling for state updates at 1-second intervals. */
  public start(): void {
    if (this.pollInterval) clearInterval(this.pollInterval)

    this.pollInterval = setInterval(() => {
      void this.poll()
    }, 1000)

    // Fire an immediate poll
    void this.poll()
  }

  /** Submit an ADD action for a menu item. */
  public addItem(item: MenuItem): void {
    const action: CartActionMessage = {
      type: "CART_ACTION",
      actionId: generateId(),
      action: "ADD",
      item,
      senderPeerId: this.peerId,
      senderName: this.peerName,
    }
    void this.submitAction(action)
  }

  /** Submit a DECREMENT action for an item by ID. */
  public decrementItem(itemId: string): void {
    const action: CartActionMessage = {
      type: "CART_ACTION",
      actionId: generateId(),
      action: "DECREMENT",
      itemId,
      senderPeerId: this.peerId,
      senderName: this.peerName,
    }
    void this.submitAction(action)
  }

  /** Stop polling and release resources. */
  public destroy(): void {
    this.isDestroyed = true
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  // ── Private ──────────────────────────────────────────────

  private async poll(): Promise<void> {
    if (this.isDestroyed || this.isPolling) return
    this.isPolling = true

    try {
      const res = await fetch(
        `/api/session/${this.sessionId}/sync?version=${this.cartVersion}`,
      )

      if (res.status === 404) {
        // Session destroyed or expired
        this.callbacks.onStatusChange("disconnected")
        if (this.callbacks.onToastNotification) {
          this.callbacks.onToastNotification("Session ended.")
        }
        this.destroy()
        return
      }

      if (!res.ok) {
        this.handlePollError()
        return
      }

      const data = (await res.json()) as {
        cartItems: CartItem[]
        cartVersion: number
        peerCount: number
        peerNames: string[]
      }

      // Reset error counter on success
      this.consecutiveErrors = 0

      // Update peer count
      this.callbacks.onPeerCountChange(data.peerCount)

      // Update cart if version changed
      if (data.cartVersion > this.cartVersion) {
        this.cartVersion = data.cartVersion
        this.callbacks.onCartSync(data.cartItems, data.cartVersion)
      }

      this.callbacks.onStatusChange("connected")
    } catch {
      this.handlePollError()
    } finally {
      this.isPolling = false
    }
  }

  private handlePollError(): void {
    this.consecutiveErrors++
    if (this.consecutiveErrors >= SessionSyncManager.MAX_CONSECUTIVE_ERRORS) {
      this.callbacks.onStatusChange(
        "error",
        "Lost connection to the session. Please check your network.",
      )
      this.destroy()
    }
  }

  private async submitAction(action: CartActionMessage): Promise<void> {
    try {
      const res = await fetch(`/api/session/${this.sessionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      })

      if (!res.ok) {
        console.error("[SyncManager] Action submission failed:", res.status)
        return
      }

      const data = (await res.json()) as {
        cartItems: CartItem[]
        cartVersion: number
        notification?: CartSyncMessage["notification"]
      }

      // Optimistically apply the server-confirmed state
      this.cartVersion = data.cartVersion
      this.callbacks.onCartSync(data.cartItems, data.cartVersion)

      // Show notification for own action
      if (data.notification && this.callbacks.onToastNotification) {
        this.callbacks.onToastNotification(
          `${data.notification.senderName} ${data.notification.action} ${data.notification.itemName}`,
        )
      }
    } catch (err) {
      console.error("[SyncManager] Failed to submit action:", err)
    }
  }
}
