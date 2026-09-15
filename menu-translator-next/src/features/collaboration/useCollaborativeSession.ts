"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { generateId } from "@/lib/generate-id"
import type { CartItem, MenuData, MenuItem } from "@/types/menu"
import type { SessionConnectionStatus, SessionRole } from "@/types/session"
import { SessionSyncManager } from "@/lib/sync/session-sync-manager"

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

  const syncManagerRef = useRef<SessionSyncManager | null>(null)
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
        }

        const bestUrl = `${window.location.origin}/?session=${data.sessionId}`

        setSessionId(data.sessionId)
        setJoinUrl(bestUrl)
        setRole("host")
        setStatus("connected")
        setPeerCount(1)
        setQrOpen(true)

        // Instantiate sync manager for host
        const manager = new SessionSyncManager({
          sessionId: data.sessionId,
          peerId: myPeerIdRef.current,
          peerName: "Host",
          initialCartVersion: 0,
          callbacks: {
            onCartSync: (items) => {
              onCartUpdated(items)
            },
            onPeerCountChange: (count) => {
              setPeerCount(count)
            },
            onStatusChange: (newStatus, err) => {
              setStatus(newStatus)
              if (err) setErrorMessage(err)
            },
            onToastNotification: showToast,
          },
        })
        syncManagerRef.current = manager
        manager.start()
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

      // Destroy any previous manager
      if (syncManagerRef.current) {
        syncManagerRef.current.destroy()
        syncManagerRef.current = null
      }

      try {
        // Join via API to register as peer and get initial state
        const res = await fetch(`/api/session/${cleanCode}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            peerId: myPeerIdRef.current,
            peerName: "Diner " + Math.floor(Math.random() * 900 + 100),
          }),
        })

        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ message: "Table session not found or has expired." }))
          throw new Error(err.message || "Could not join session.")
        }

        const joinData = (await res.json()) as {
          hostPeerId: string
          menuData?: MenuData
          cartItems: CartItem[]
          cartVersion: number
          peerCount: number
        }

        // Hydrate menu and cart immediately
        if (joinData.menuData) {
          onMenuReceived(joinData.menuData)
        }
        onCartUpdated(joinData.cartItems || [])
        setPeerCount(joinData.peerCount)
        setStatus("connected")

        // Start sync polling
        const manager = new SessionSyncManager({
          sessionId: cleanCode,
          peerId: myPeerIdRef.current,
          peerName: "Diner " + Math.floor(Math.random() * 900 + 100),
          initialCartVersion: joinData.cartVersion || 0,
          callbacks: {
            onCartSync: (items) => {
              onCartUpdated(items)
            },
            onPeerCountChange: (count) => {
              setPeerCount(count)
            },
            onStatusChange: (newStatus, err) => {
              setStatus(newStatus)
              if (err) setErrorMessage(err)
            },
            onToastNotification: showToast,
          },
        })
        syncManagerRef.current = manager
        manager.start()
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not join session."
        console.error("[useCollaborativeSession] joinSession error:", err)
        setStatus("error")
        setErrorMessage(msg)
      }
    },
    [onCartUpdated, onMenuReceived, showToast],
  )

  // 3. Add to Cart action dispatcher
  const dispatchAddToCart = useCallback(
    (item: MenuItem): boolean => {
      if (syncManagerRef.current) {
        syncManagerRef.current.addItem(item)
        return true
      }
      return false
    },
    [],
  )

  // 4. Decrement Cart action dispatcher
  const dispatchDecrementCart = useCallback(
    (itemId: string): boolean => {
      if (syncManagerRef.current) {
        syncManagerRef.current.decrementItem(itemId)
        return true
      }
      return false
    },
    [],
  )

  // 5. Leave / Terminate session
  const leaveSession = useCallback(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.destroy()
      syncManagerRef.current = null
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
      if (syncManagerRef.current) syncManagerRef.current.destroy()
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
