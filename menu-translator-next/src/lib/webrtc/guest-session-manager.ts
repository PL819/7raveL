import type { CartItem, MenuData, MenuItem } from "@/types/menu";
import type {
  CartActionMessage,
  CartSyncMessage,
  CollaborativeWireMessage,
  SignalingMessage,
  TransportMode,
} from "@/types/session";
import { isWebRTCSupported, RTC_CONFIG } from "./webrtc-config";

export interface GuestSessionManagerCallbacks {
  onSessionInit: (data: {
    menuData: MenuData;
    cartItems: CartItem[];
    cartVersion: number;
    peerCount: number;
  }) => void;
  onCartSync: (cartItems: CartItem[], version: number) => void;
  onPeerCountChange: (peerCount: number) => void;
  onStatusChange: (
    status: "connecting" | "connected" | "disconnected" | "error",
    errorMessage?: string,
  ) => void;
  onToastNotification?: (message: string) => void;
}

export class GuestSessionManager {
  public sessionId: string;
  public guestPeerId: string;
  public guestName: string;
  public hostPeerId: string | null = null;
  private pc?: RTCPeerConnection;
  private dc?: RTCDataChannel;
  private callbacks: GuestSessionManagerCallbacks;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private relayInterval: ReturnType<typeof setInterval> | null = null;
  private transportMode: TransportMode = "webrtc";
  private cartVersion = 0;
  private isDestroyed = false;
  private webrtcTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(
    sessionId: string,
    guestPeerId: string,
    guestName = "Guest",
    callbacks: GuestSessionManagerCallbacks,
  ) {
    this.sessionId = sessionId.toUpperCase().trim();
    this.guestPeerId = guestPeerId;
    this.guestName = guestName;
    this.callbacks = callbacks;
  }

  public async start(): Promise<void> {
    this.callbacks.onStatusChange("connecting");

    try {
      // 1. Join room via API
      const res = await fetch(`/api/session/${this.sessionId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peerId: this.guestPeerId,
          peerName: this.guestName,
        }),
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Table session not found or has expired." }));
        throw new Error(err.message || "Could not join session.");
      }

      const joinData = (await res.json()) as {
        hostPeerId: string;
        hostName?: string;
        menuData?: MenuData;
        peerCount: number;
        cartItems: CartItem[];
        cartVersion: number;
      };

      this.hostPeerId = joinData.hostPeerId;
      this.cartVersion = joinData.cartVersion || 0;
      this.callbacks.onPeerCountChange(joinData.peerCount);

      // Hydrate menuData and cart immediately from persisted session
      if (joinData.menuData) {
        this.callbacks.onSessionInit({
          menuData: joinData.menuData,
          cartItems: joinData.cartItems || [],
          cartVersion: joinData.cartVersion || 0,
          peerCount: joinData.peerCount,
        });
      }

      // 2. Setup WebRTC if supported
      if (isWebRTCSupported()) {
        await this.setupWebRTC();
        this.startSignalingPolling();

        // Fallback timer: If WebRTC hasn't connected in 4.5 seconds, activate server relay
        this.webrtcTimeoutTimer = setTimeout(() => {
          if (!this.dc || this.dc.readyState !== "open") {
            this.activateRelayFallback();
          }
        }, 4500);
      } else {
        this.activateRelayFallback();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not join session.";
      console.error("[GuestManager] Failed to start:", msg);
      this.callbacks.onStatusChange("error", msg);
    }
  }

  private async setupWebRTC(): Promise<void> {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.pc = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && this.hostPeerId) {
        void this.sendSignal({
          toPeerId: this.hostPeerId,
          type: "candidate",
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        });
      }
    };

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      this.dc = dc;

      dc.onopen = () => {
        if (this.webrtcTimeoutTimer) clearTimeout(this.webrtcTimeoutTimer);
        if (this.relayInterval) {
          clearInterval(this.relayInterval);
          this.relayInterval = null;
        }
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
        this.transportMode = "webrtc";
        this.callbacks.onStatusChange("connected");
      };

      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as CollaborativeWireMessage;
          this.handleWireMessage(msg);
        } catch (err) {
          console.error(
            "[GuestManager] Error parsing DataChannel message:",
            err,
          );
        }
      };

      dc.onclose = () => {
        if (!this.isDestroyed) {
          // Switch to relay if WebRTC drops unexpectedly
          this.activateRelayFallback();
        }
      };
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        this.activateRelayFallback();
      }
    };
  }

  private startSignalingPolling(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(() => {
      void this.pollSignals();
    }, 1000);
  }

  private isPollingSignals = false;
  private async pollSignals(): Promise<void> {
    if (this.isDestroyed || !this.pc || this.isPollingSignals) return;
    this.isPollingSignals = true;

    try {
      const res = await fetch(
        `/api/session/${this.sessionId}/signal?peerId=${encodeURIComponent(this.guestPeerId)}`,
      );
      if (res.status === 404) {
        this.handleWireMessage({ type: "SESSION_TERMINATED" } as CollaborativeWireMessage);
        return;
      }
      if (!res.ok) return;

      const data = (await res.json()) as {
        signals: SignalingMessage[];
        peerCount: number;
      };
      if (data.peerCount) {
        this.callbacks.onPeerCountChange(data.peerCount);
      }

      if (!data.signals || data.signals.length === 0) return;

      for (const signal of data.signals) {
        if (signal.type === "offer" && signal.sdp) {
          await this.pc.setRemoteDescription({
            type: "offer",
            sdp: signal.sdp,
          });
          
          const queued = [...this.pendingCandidates];
          this.pendingCandidates = [];
          for (const cand of queued) {
            await this.pc.addIceCandidate(new RTCIceCandidate(cand)).catch((err) => {
              console.error("[GuestManager] Error adding queued candidate:", err);
            });
          }

          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);

          if (this.hostPeerId) {
            await this.sendSignal({
              toPeerId: this.hostPeerId,
              type: "answer",
              sdp: answer.sdp,
            });
          }
        } else if (signal.type === "candidate" && signal.candidate) {
          if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
            try {
              await this.pc.addIceCandidate(
                new RTCIceCandidate(signal.candidate),
              );
            } catch (err) {
              console.error("[GuestManager] Error adding candidate:", err);
            }
          } else {
            this.pendingCandidates.push(signal.candidate);
          }
        }
      }
    } catch {
      // Retry next interval
    } finally {
      this.isPollingSignals = false;
    }
  }

  private handleWireMessage(msg: CollaborativeWireMessage): void {
    if (msg.type === "SESSION_INIT") {
      this.cartVersion = msg.cartVersion;
      this.callbacks.onSessionInit({
        menuData: msg.menuData,
        cartItems: msg.cartItems,
        cartVersion: msg.cartVersion,
        peerCount: msg.peerCount,
      });
      this.callbacks.onStatusChange("connected");
    } else if (msg.type === "CART_SYNC") {
      if (msg.cartVersion >= this.cartVersion) {
        this.cartVersion = msg.cartVersion;
        this.callbacks.onCartSync(msg.cartItems, msg.cartVersion);
        if (msg.notification && this.callbacks.onToastNotification) {
          this.callbacks.onToastNotification(
            `${msg.notification.senderName} ${msg.notification.action} ${msg.notification.itemName}`,
          );
        }
      }
    } else if (msg.type === "PEER_PRESENCE") {
      this.callbacks.onPeerCountChange(msg.peerCount);
    } else if (msg.type === "SESSION_TERMINATED") {
      this.callbacks.onStatusChange("disconnected");
      if (this.callbacks.onToastNotification) {
        this.callbacks.onToastNotification("Host ended the session.");
      }
      this.destroy();
    }
  }

  private activateRelayFallback(): void {
    if (this.transportMode === "relay") return;
    this.transportMode = "relay";
    this.callbacks.onStatusChange("connected");

    // Stop fast signaling polling if DC didn't open
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Start 1500ms relay polling
    if (!this.relayInterval && !this.isDestroyed) {
      this.relayInterval = setInterval(() => {
        void this.pollRelaySync();
      }, 1500);
    }
  }

  private isPollingRelay = false;
  private async pollRelaySync(): Promise<void> {
    if (this.isDestroyed || this.isPollingRelay) return;
    this.isPollingRelay = true;

    try {
      const res = await fetch(
        `/api/session/${this.sessionId}/relay?role=guest&version=${this.cartVersion}`,
      );
      if (res.status === 404) {
        this.handleWireMessage({ type: "SESSION_TERMINATED" } as CollaborativeWireMessage);
        return;
      }
      if (!res.ok) return;

      const data = (await res.json()) as {
        sync?: CartSyncMessage;
        peerCount?: number;
      };

      if (data.peerCount) {
        this.callbacks.onPeerCountChange(data.peerCount);
      }

      if (data.sync && data.sync.cartVersion > this.cartVersion) {
        this.cartVersion = data.sync.cartVersion;
        this.callbacks.onCartSync(data.sync.cartItems, data.sync.cartVersion);
      }
    } catch {
      // Ignore transient errors
    } finally {
      this.isPollingRelay = false;
    }
  }

  public addItem(item: MenuItem): void {
    const actionMsg: CartActionMessage = {
      type: "CART_ACTION",
      action: "ADD",
      item,
      senderPeerId: this.guestPeerId,
      senderName: this.guestName,
    };
    this.dispatchAction(actionMsg);
  }

  public decrementItem(itemId: string): void {
    const actionMsg: CartActionMessage = {
      type: "CART_ACTION",
      action: "DECREMENT",
      itemId,
      senderPeerId: this.guestPeerId,
      senderName: this.guestName,
    };
    this.dispatchAction(actionMsg);
  }

  private dispatchAction(actionMsg: CartActionMessage): void {
    if (this.dc && this.dc.readyState === "open") {
      try {
        this.dc.send(JSON.stringify(actionMsg));
        return;
      } catch (err) {
        console.warn(
          "[GuestManager] DataChannel send failed, falling back to relay:",
          err,
        );
      }
    }

    // Fallback: POST action to relay endpoint
    void fetch(`/api/session/${this.sessionId}/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actionMsg),
    }).catch((err) => {
      console.error("[GuestManager] Failed to send relay action:", err);
    });
  }

  private async sendSignal(
    payload: Omit<
      SignalingMessage,
      "id" | "sessionId" | "fromPeerId" | "timestamp"
    >,
  ): Promise<void> {
    try {
      await fetch(`/api/session/${this.sessionId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          sessionId: this.sessionId,
          fromPeerId: this.guestPeerId,
        }),
      });
    } catch (err) {
      console.error("[GuestManager] Failed to send signal:", err);
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    if (this.relayInterval) clearInterval(this.relayInterval);
    if (this.webrtcTimeoutTimer) clearTimeout(this.webrtcTimeoutTimer);

    if (this.dc) this.dc.close();
    if (this.pc) this.pc.close();
  }
}
