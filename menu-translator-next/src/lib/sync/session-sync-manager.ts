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

// ── Polling constants ────────────────────────────────────

/** Fast poll rate during the burst window after activity. */
const ACTIVE_INTERVAL_MS = 600
/** Slow poll rate when idle (no activity for BURST_WINDOW_MS). */
const IDLE_INTERVAL_MS = 2000
/** How long to stay in active/burst mode after the last activity signal. */
const BURST_WINDOW_MS = 15_000

/**
 * Unified session sync manager used by both host and guest roles.
 * Communicates with the server via REST endpoints:
 *   - POST /api/session/{id}/action  → submit cart mutations
 *   - GET  /api/session/{id}/sync    → poll for authoritative state
 *
 * Features:
 *   - Adaptive polling: 600ms during activity bursts, 2s when idle
 *   - Page visibility: pauses polling when the tab is hidden
 *   - Consecutive-error circuit breaker
 */
export class SessionSyncManager {
  public sessionId: string
  public peerId: string
  public peerName: string

  private cartVersion = 0
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private isDestroyed = false
  private isPolling = false
  private callbacks: SyncManagerCallbacks
  private consecutiveErrors = 0
  private static readonly MAX_CONSECUTIVE_ERRORS = 10

  // ── Adaptive interval state ────────────────────────────
  private lastActivityAt = 0
  private currentIntervalMs = IDLE_INTERVAL_MS

  // ── Visibility state ──────────────────────────────────
  private handleVisibilityChange: (() => void) | null = null
  private tabVisible = true

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

  // ── Public API ─────────────────────────────────────────

  /** Start polling for state updates and attach visibility listener. */
  public start(): void {
    this.attachVisibilityListener()
    this.signalActivity() // Enter burst mode immediately on start
    this.scheduleNextPoll(0) // Immediate first poll
  }

  /**
   * Signal that meaningful activity has occurred (cart action, join, QR open,
   * remote version increment). Switches to the fast 600ms poll rate for 15s.
   */
  public signalActivity(): void {
    this.lastActivityAt = Date.now()
    const wasIdle = this.currentIntervalMs === IDLE_INTERVAL_MS
    this.currentIntervalMs = ACTIVE_INTERVAL_MS

    // If we were idle and the tab is visible, reschedule immediately
    // to switch to the faster rate without waiting for the current
    // slow-interval timer to fire.
    if (wasIdle && this.tabVisible && !this.isDestroyed) {
      this.scheduleNextPoll(0)
    }
  }

  /** Submit an ADD action for a menu item. */
  public addItem(item: MenuItem): void {
    this.signalActivity()
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
    this.signalActivity()
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

  /** Stop polling, detach listeners, and release resources. */
  public destroy(): void {
    this.isDestroyed = true
    this.clearPollTimer()
    this.detachVisibilityListener()
  }

  // ── Adaptive interval logic ────────────────────────────

  /** Returns the appropriate interval for the next poll. */
  private getNextInterval(): number {
    const elapsed = Date.now() - this.lastActivityAt
    if (elapsed < BURST_WINDOW_MS) {
      this.currentIntervalMs = ACTIVE_INTERVAL_MS
    } else {
      this.currentIntervalMs = IDLE_INTERVAL_MS
    }
    return this.currentIntervalMs
  }

  /**
   * Clears any pending poll timer and schedules a new one.
   * Uses setTimeout (not setInterval) so each tick can pick a
   * fresh interval without leaking overlapping timers.
   */
  private scheduleNextPoll(delayMs?: number): void {
    this.clearPollTimer()
    if (this.isDestroyed || !this.tabVisible) return

    const delay = delayMs ?? this.getNextInterval()
    this.pollTimer = setTimeout(() => {
      void this.poll().finally(() => {
        if (!this.isDestroyed && this.tabVisible) {
          this.scheduleNextPoll()
        }
      })
    }, delay)
  }

  private clearPollTimer(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }

  // ── Visibility management ──────────────────────────────

  private attachVisibilityListener(): void {
    if (typeof document === "undefined") return

    this.handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        this.tabVisible = false
        this.clearPollTimer()
      } else {
        this.tabVisible = true
        // Resume: immediate poll then restart the loop
        this.scheduleNextPoll(0)
      }
    }

    document.addEventListener("visibilitychange", this.handleVisibilityChange)
    this.tabVisible = document.visibilityState === "visible"
  }

  private detachVisibilityListener(): void {
    if (this.handleVisibilityChange && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange)
      this.handleVisibilityChange = null
    }
  }

  // ── Core polling ───────────────────────────────────────

  private async poll(): Promise<void> {
    if (this.isDestroyed || this.isPolling) return
    this.isPolling = true

    try {
      const res = await fetch(
        `/api/session/${this.sessionId}/sync?version=${this.cartVersion}`,
      )

      if (res.status === 404) {
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

      // Update cart if version changed — this is a remote update, go into burst
      if (data.cartVersion > this.cartVersion) {
        this.cartVersion = data.cartVersion
        this.callbacks.onCartSync(data.cartItems, data.cartVersion)
        this.signalActivity()
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

  // ── Action submission ──────────────────────────────────

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

      // Apply server-confirmed state
      this.cartVersion = data.cartVersion
      this.callbacks.onCartSync(data.cartItems, data.cartVersion)

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
