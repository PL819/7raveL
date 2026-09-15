import type { CartItem, MenuData, MenuItem } from "./menu"

export type SessionRole = "none" | "host" | "guest"

export type SessionConnectionStatus =
  | "idle"
  | "creating"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"

export interface SessionPeerInfo {
  peerId: string
  name: string
  joinedAt: number
}

// Cart action sent from any participant to the server
export interface CartActionMessage {
  type: "CART_ACTION"
  actionId: string
  action: "ADD" | "DECREMENT"
  item?: MenuItem
  itemId?: string
  senderPeerId: string
  senderName: string
}

// Authoritative cart state broadcast from server to all participants
export interface CartSyncMessage {
  type: "CART_SYNC"
  cartItems: CartItem[]
  cartVersion: number
  notification?: {
    senderName: string
    action: "added" | "removed"
    itemName: string
  }
}

export interface PeerPresenceMessage {
  type: "PEER_PRESENCE"
  peerCount: number
  peerNames: string[]
}

export type CollaborativeWireMessage =
  | CartActionMessage
  | CartSyncMessage
  | PeerPresenceMessage
