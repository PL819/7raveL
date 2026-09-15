"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { generateId } from "@/lib/generate-id"
import type { CartItem, MenuData, MenuItem } from "@/types/menu"
import type { SessionConnectionStatus, SessionRole } from "@/types/session"
import { HostSessionManager } from "@/lib/webrtc/host-session-manager"
import { GuestSessionManager } from "@/lib/webrtc/guest-session-manager"

interface UseCollaborativeSessionOptions {
  onMenuReceived: (menu: MenuData) => void
  onCartUpdated: (items: CartItem[]) => void
}

export function useCollaborativeSession({
  onMenuReceived,
  onCartUpdated,
}: UseCollaborativeSessionOptions) {
  const [role, setRole] = useState<SessionRole>("none")
  const [status, setStatus] = useState<SessionConnectionStatus>("idle")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState<string>("")
  const [peerCount, setPeerCount] = useState<number>(1)
  const [qrOpen, setQrOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const hostManagerRef = useRef<HostSessionManager | null>(null)
  const guestManagerRef = useRef<GuestSessionManager | null>(null)
  const myPeerIdRef = useRef<string>(generateId())

  // Show transient toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(null), 3000)
  }, [])

  // 1. Host: Start a collaborative session
  const startSession = useCallback(
    async (menuData: MenuData, initialCart: CartItem[]) => {
      setStatus("creating")
      setErrorMessage(null)
      try {
        const res = await fetch("/api/session/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostPeerId: myPeerIdRef.current,
            hostName: "Host",
            menuData,
            initialCart,
          }),
        })

        if (!res.ok) throw new Error("Failed to create session")

        const data = (await res.json()) as {
          sessionId: string
          joinUrl: string
          currentOriginJoinUrl?: string
        }

        // Prefer joinUrl (wifi IP) for local testing so phones can scan and connect.
        // Prefer currentOriginJoinUrl for production (Vercel) since the server IP is unreachable.
        const bestUrl =
          typeof window !== "undefined" && window.location.hostname !== "localhost"
            ? `${window.location.origin}/?session=${data.sessionId}`
            : data.joinUrl

        setSessionId(data.sessionId)
        setJoinUrl(bestUrl)
        setRole("host")
        setStatus("connected")
        setPeerCount(1)
        setQrOpen(true)

        // Instantiate Host Manager
        const manager = new HostSessionManager(
          data.sessionId,
          myPeerIdRef.current,
          menuData,
          initialCart,
          {
            onCartChange: (items) => {
              onCartUpdated(items)
            },
            onPeerCountChange: (count) => {
              setPeerCount(count)
            },
            onToastNotification: showToast,
          },
        )
        hostManagerRef.current = manager
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create session"
        console.error("[useCollaborativeSession] startSession error:", err)
        setStatus("error")
        setErrorMessage(msg)
      }
    },
    [onCartUpdated, showToast],
  )

  // 2. Guest: Join an existing session
  const joinSession = useCallback(
    async (code: string) => {
      const cleanCode = code.toUpperCase().trim()
      setSessionId(cleanCode)
      setRole("guest")
      setStatus("connecting")
      setErrorMessage(null)

      if (guestManagerRef.current) {
        guestManagerRef.current.destroy()
      }

      const manager = new GuestSessionManager(
        cleanCode,
        myPeerIdRef.current,
        "Diner " + Math.floor(Math.random() * 900 + 100),
        {
          onSessionInit: (init) => {
            onMenuReceived(init.menuData)
            onCartUpdated(init.cartItems)
            setPeerCount(init.peerCount)
            setStatus("connected")
          },
          onCartSync: (items) => {
            onCartUpdated(items)
          },
          onPeerCountChange: (count) => {
            setPeerCount(count)
          },
          onStatusChange: (newStatus, err) => {
            setStatus(newStatus)
            if (err) {
              setErrorMessage(err)
            }
          },
          onToastNotification: showToast,
        },
      )

      guestManagerRef.current = manager
      await manager.start()
    },
    [onCartUpdated, onMenuReceived, showToast],
  )

  // 3. Add to Cart action dispatcher
  const dispatchAddToCart = useCallback(
    (item: MenuItem): boolean => {
      if (role === "host" && hostManagerRef.current) {
        hostManagerRef.current.addItem(item)
        return true
      }
      if (role === "guest" && guestManagerRef.current) {
        guestManagerRef.current.addItem(item)
        return true
      }
      return false
    },
    [role],
  )

  // 4. Decrement Cart action dispatcher
  const dispatchDecrementCart = useCallback(
    (itemId: string): boolean => {
      if (role === "host" && hostManagerRef.current) {
        hostManagerRef.current.decrementItem(itemId)
        return true
      }
      if (role === "guest" && guestManagerRef.current) {
        guestManagerRef.current.decrementItem(itemId)
        return true
      }
      return false
    },
    [role],
  )

  // 5. Leave / Terminate session
  const leaveSession = useCallback(() => {
    if (hostManagerRef.current) {
      hostManagerRef.current.destroy()
      hostManagerRef.current = null
    }
    if (guestManagerRef.current) {
      guestManagerRef.current.destroy()
      guestManagerRef.current = null
    }

    if (role === "host" && sessionId) {
      fetch(`/api/session/${sessionId}/destroy`, { method: "POST" }).catch((err) => {
        console.error("Failed to destroy session", err)
      })
    }

    setRole("none")
    setStatus("idle")
    setSessionId(null)
    setJoinUrl("")
    setPeerCount(1)
    setQrOpen(false)
    setErrorMessage(null)
  }, [role, sessionId])

  // Warn host before closing tab while guests are connected
  useEffect(() => {
    if (role === "host" && peerCount > 1) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
      }
      window.addEventListener("beforeunload", handleBeforeUnload)
      return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [peerCount, role])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hostManagerRef.current) hostManagerRef.current.destroy()
      if (guestManagerRef.current) guestManagerRef.current.destroy()
    }
  }, [])

  return {
    role,
    status,
    sessionId,
    joinUrl,
    peerCount,
    qrOpen,
    setQrOpen,
    toastMessage,
    errorMessage,
    isHost: role === "host",
    isGuest: role === "guest",
    isCollaborative: role !== "none",
    startSession,
    joinSession,
    dispatchAddToCart,
    dispatchDecrementCart,
    leaveSession,
  }
}
