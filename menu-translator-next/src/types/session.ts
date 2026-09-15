import type { CartItem, MenuData, MenuItem } from "./menu"

export type SessionRole = "none" | "host" | "guest"

export type SessionConnectionStatus =
  | "idle"
  | "creating"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"

export type TransportMode = "webrtc" | "relay"

export interface SessionPeerInfo {
  peerId: string
  name: string
  joinedAt: number
  transport: TransportMode
}

export interface IceCandidatePayload {
  candidate: string
  sdpMid?: string | null
  sdpMLineIndex?: number | null
}

export interface SignalingMessage {
  id: string
  sessionId: string
  fromPeerId: string
  toPeerId: string
  type: "offer" | "answer" | "candidate" | "peer_joined" | "peer_left"
  sdp?: string
  candidate?: IceCandidatePayload
  peerName?: string
  timestamp: number
}

// WebRTC DataChannel wire protocol messages
export interface SessionInitMessage {
  type: "SESSION_INIT"
  sessionId: string
  hostPeerId: string
  menuData: MenuData
  cartItems: CartItem[]
  cartVersion: number
  peerCount: number
}

export interface CartActionMessage {
  type: "CART_ACTION"
  action: "ADD" | "DECREMENT"
  item?: MenuItem
  itemId?: string
  senderPeerId: string
  senderName: string
}

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

export interface SessionTerminatedMessage {
  type: "SESSION_TERMINATED"
  reason?: string
}

export type CollaborativeWireMessage =
  | SessionInitMessage
  | CartActionMessage
  | CartSyncMessage
  | PeerPresenceMessage
  | SessionTerminatedMessage
