import type { CartItem, MenuData, MenuItem } from "@/types/menu"
import type {
  CartActionMessage,
  CartSyncMessage,
  CollaborativeWireMessage,
  SessionInitMessage,
  SignalingMessage,
  PeerPresenceMessage,
} from "@/types/session"
import { isWebRTCSupported, RTC_CONFIG } from "./webrtc-config"

export interface HostSessionManagerCallbacks {
  onCartChange: (cartItems: CartItem[]) => void
  onPeerCountChange: (peerCount: number) => void
  onToastNotification?: (message: string) => void
}

interface PeerConnectionRecord {
  peerId: string
  name: string
  pc?: RTCPeerConnection
  dc?: RTCDataChannel
  connected: boolean
  pendingCandidates: RTCIceCandidateInit[]
}

export class HostSessionManager {
  public sessionId: string
  public hostPeerId: string
  private menuData: MenuData
  private cartItems: CartItem[]
  private cartVersion = 0
  private peers = new Map<string, PeerConnectionRecord>()
  private callbacks: HostSessionManagerCallbacks
  private pollingInterval: ReturnType<typeof setInterval> | null = null
  private relayPollInterval: ReturnType<typeof setInterval> | null = null
  private isDestroyed = false

  constructor(
    sessionId: string,
    hostPeerId: string,
    menuData: MenuData,
    initialCart: CartItem[],
    callbacks: HostSessionManagerCallbacks,
  ) {
    this.sessionId = sessionId
    this.hostPeerId = hostPeerId
    this.menuData = menuData
    this.cartItems = [...initialCart]
    this.callbacks = callbacks

    this.startSignalingPolling()
    this.startRelayPolling()
  }

  public getPeerCount(): number {
    let connected = 0
    for (const p of this.peers.values()) {
      if (p.connected) connected++
    }
    return connected + 1 // Include host
  }

  public getPeerNames(): string[] {
    const names = ["Host"]
    for (const p of this.peers.values()) {
      if (p.connected) names.push(p.name)
    }
    return names
  }

  private broadcastPeerPresence(): void {
    const msg: PeerPresenceMessage = {
      type: "PEER_PRESENCE",
      peerCount: this.getPeerCount(),
      peerNames: this.getPeerNames(),
    }
    const json = JSON.stringify(msg)
    for (const peer of this.peers.values()) {
      if (peer.dc && peer.dc.readyState === "open") {
        try {
          peer.dc.send(json)
        } catch (err) {}
      }
    }
  }

  public getCartItems(): CartItem[] {
    return this.cartItems
  }

  // Authoritative host action: Add item to cart
  public addItem(item: MenuItem, senderName = "Host"): void {
    const existingIndex = this.cartItems.findIndex((ci) => ci.item.id === item.id)
    if (existingIndex >= 0) {
      this.cartItems = this.cartItems.map((ci, idx) =>
        idx === existingIndex ? { ...ci, quantity: ci.quantity + 1 } : ci,
      )
    } else {
      this.cartItems = [...this.cartItems, { item, quantity: 1 }]
    }

    this.cartVersion++
    this.broadcastCartSync({
      senderName,
      action: "added",
      itemName: item.translatedName,
    })
    this.callbacks.onCartChange(this.cartItems)
  }

  // Authoritative host action: Decrement item
  public decrementItem(itemId: string, senderName = "Host"): void {
    const targetItem = this.cartItems.find((ci) => ci.item.id === itemId)
    if (!targetItem) return

    if (targetItem.quantity > 1) {
      this.cartItems = this.cartItems.map((ci) =>
        ci.item.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci,
      )
    } else {
      this.cartItems = this.cartItems.filter((ci) => ci.item.id !== itemId)
    }

    this.cartVersion++
    this.broadcastCartSync({
      senderName,
      action: "removed",
      itemName: targetItem.item.translatedName,
    })
    this.callbacks.onCartChange(this.cartItems)
  }

  private broadcastCartSync(notification?: CartSyncMessage["notification"]): void {
    const syncMsg: CartSyncMessage = {
      type: "CART_SYNC",
      cartItems: this.cartItems,
      cartVersion: this.cartVersion,
      notification,
    }

    const json = JSON.stringify(syncMsg)

    // Broadcast over open WebRTC DataChannels
    for (const peer of this.peers.values()) {
      if (peer.dc && peer.dc.readyState === "open") {
        try {
          peer.dc.send(json)
        } catch (err) {
          console.error(`[HostManager] Failed to send sync to peer ${peer.peerId}:`, err)
        }
      }
    }

    // Also update server relay for any guests in fallback mode
    void fetch(`/api/session/${this.sessionId}/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(syncMsg),
    }).catch(() => {})
  }

  private startSignalingPolling(): void {
    // 250ms fast polling for joining peers and SDP signals
    this.pollingInterval = setInterval(() => {
      void this.pollSignals()
    }, 250)
  }

  private startRelayPolling(): void {
    // 500ms polling for relay cart actions from guests without WebRTC
    this.relayPollInterval = setInterval(() => {
      void this.pollRelayActions()
    }, 500)
  }

  private isPollingSignals = false
  private async pollSignals(): Promise<void> {
    if (this.isDestroyed || this.isPollingSignals) return
    this.isPollingSignals = true

    try {
      const res = await fetch(
        `/api/session/${this.sessionId}/signal?peerId=${encodeURIComponent(this.hostPeerId)}`,
      )
      if (!res.ok) return

      const data = (await res.json()) as { signals: SignalingMessage[] }
      if (!data.signals || data.signals.length === 0) return

      for (const signal of data.signals) {
        await this.handleIncomingSignal(signal)
      }
    } catch {
      // Network hiccup; will retry next interval
    } finally {
      this.isPollingSignals = false
    }
  }

  private async handleIncomingSignal(signal: SignalingMessage): Promise<void> {
    const fromPeerId = signal.fromPeerId

    if (signal.type === "peer_joined") {
      const guestName = signal.peerName || "Dining Partner"
      
      const existingPeer = this.peers.get(fromPeerId)
      if (existingPeer) {
        if (existingPeer.dc) existingPeer.dc.close()
        if (existingPeer.pc) existingPeer.pc.close()
      }

      this.peers.set(fromPeerId, {
        peerId: fromPeerId,
        name: guestName,
        connected: false,
        pendingCandidates: [],
      })

      if (isWebRTCSupported()) {
        await this.initiatePeerConnection(fromPeerId, guestName)
      }
      return
    }

    const peerRecord = this.peers.get(fromPeerId)
    if (!peerRecord || !peerRecord.pc) return

    if (signal.type === "answer" && signal.sdp) {
      try {
        await peerRecord.pc.setRemoteDescription({
          type: "answer",
          sdp: signal.sdp,
        })

        const queued = [...peerRecord.pendingCandidates]
        peerRecord.pendingCandidates = []
        for (const cand of queued) {
          await peerRecord.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(err => {
            console.error(`[HostManager] Error adding queued ICE candidate for ${fromPeerId}:`, err)
          })
        }
      } catch (err) {
        console.error(`[HostManager] Error setting remote description for ${fromPeerId}:`, err)
      }
    } else if (signal.type === "candidate" && signal.candidate) {
      if (peerRecord.pc.remoteDescription && peerRecord.pc.remoteDescription.type) {
        try {
          await peerRecord.pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
        } catch (err) {
          console.error(`[HostManager] Error adding ICE candidate for ${fromPeerId}:`, err)
        }
      } else {
        peerRecord.pendingCandidates.push(signal.candidate)
      }
    }
  }

  private async initiatePeerConnection(peerId: string, peerName: string): Promise<void> {
    try {
      const pc = new RTCPeerConnection(RTC_CONFIG)
      const dc = pc.createDataChannel("order-sync", { ordered: true })

      const record: PeerConnectionRecord = {
        peerId,
        name: peerName,
        pc,
        dc,
        connected: false,
        pendingCandidates: [],
      }
      this.peers.set(peerId, record)

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void this.sendSignal({
            toPeerId: peerId,
            type: "candidate",
            candidate: {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
            },
          })
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          record.connected = true
          this.callbacks.onPeerCountChange(this.getPeerCount())
          this.broadcastPeerPresence()
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          record.connected = false
          this.callbacks.onPeerCountChange(this.getPeerCount())
          this.broadcastPeerPresence()
        }
      }

      dc.onopen = () => {
        record.connected = true
        this.callbacks.onPeerCountChange(this.getPeerCount())
        this.broadcastPeerPresence()

        // Send initial state hydration to newly connected guest
        const initMsg: SessionInitMessage = {
          type: "SESSION_INIT",
          sessionId: this.sessionId,
          hostPeerId: this.hostPeerId,
          menuData: this.menuData,
          cartItems: this.cartItems,
          cartVersion: this.cartVersion,
          peerCount: this.getPeerCount(),
        }
        dc.send(JSON.stringify(initMsg))
      }

      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as CollaborativeWireMessage
          this.handleDataChannelMessage(data)
        } catch (err) {
          console.error("[HostManager] Failed to parse DataChannel message:", err)
        }
      }

      dc.onclose = () => {
        record.connected = false
        this.callbacks.onPeerCountChange(this.getPeerCount())
        this.broadcastPeerPresence()
      }

      // Create and send SDP offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await this.sendSignal({
        toPeerId: peerId,
        type: "offer",
        sdp: offer.sdp,
      })
    } catch (err) {
      console.error(`[HostManager] Failed to initiate WebRTC for ${peerId}:`, err)
    }
  }

  private handleDataChannelMessage(msg: CollaborativeWireMessage): void {
    if (msg.type === "CART_ACTION") {
      if (msg.action === "ADD" && msg.item) {
        this.addItem(msg.item, msg.senderName)
      } else if (msg.action === "DECREMENT" && msg.itemId) {
        this.decrementItem(msg.itemId, msg.senderName)
      }
    }
  }

  private isPollingRelay = false
  private async pollRelayActions(): Promise<void> {
    if (this.isDestroyed || this.isPollingRelay) return
    this.isPollingRelay = true

    try {
      const res = await fetch(`/api/session/${this.sessionId}/relay?role=host`)
      if (!res.ok) return

      const data = (await res.json()) as { actions?: CartActionMessage[] }
      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          this.handleDataChannelMessage(action)
        }
      }
    } catch {
      // Ignore transient errors
    } finally {
      this.isPollingRelay = false
    }
  }

  private async sendSignal(
    payload: Omit<SignalingMessage, "id" | "sessionId" | "fromPeerId" | "timestamp">,
  ): Promise<void> {
    try {
      await fetch(`/api/session/${this.sessionId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          sessionId: this.sessionId,
          fromPeerId: this.hostPeerId,
        }),
      })
    } catch (err) {
      console.error("[HostManager] Failed to send signal:", err)
    }
  }

  public destroy(): void {
    this.isDestroyed = true
    if (this.pollingInterval) clearInterval(this.pollingInterval)
    if (this.relayPollInterval) clearInterval(this.relayPollInterval)

    const termMsg: import("@/types/session").SessionTerminatedMessage = { type: "SESSION_TERMINATED" }
    const termJson = JSON.stringify(termMsg)

    for (const peer of this.peers.values()) {
      if (peer.dc && peer.dc.readyState === "open") {
        try {
          peer.dc.send(termJson)
        } catch (err) {
          console.error(`[HostManager] Failed to send termination msg to ${peer.peerId}:`, err)
        }
      }
      if (peer.dc) peer.dc.close()
      if (peer.pc) peer.pc.close()
    }
    this.peers.clear()
  }
}
