"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Camera, ShoppingCart, UtensilsCrossed } from "lucide-react"

import { CartPage } from "@/features/cart/CartPage"
import { MenuBrowserPage } from "@/features/menu-browser/MenuBrowserPage"
import { MenuUploadPage } from "@/features/menu-upload/MenuUploadPage"
import { SessionQrDrawer } from "@/features/collaboration/SessionQrDrawer"
import { JoiningSessionOverlay } from "@/features/collaboration/JoiningSessionOverlay"
import { useCollaborativeSession } from "@/features/collaboration/useCollaborativeSession"
import { getTranslations } from "@/lib/ui-translations"
import { loadLanguagePreference } from "@/lib/translation-languages"
import { cn } from "@/lib/utils"
import type { CartItem, MenuData, MenuItem, TranslationLanguage, ViewState } from "@/types/menu"

// Shared layout ID for the animated active-tab indicator
const NAV_INDICATOR_ID = "nav-active-indicator"

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
} as const

const PAGE_TRANSITION = { duration: 0.2, ease: "easeInOut" as const }

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
          Loading Menu Translator…
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  )
}

function HomePageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sessionQuery = searchParams.get("session")

  const [view, setView] = useState<ViewState>("upload")
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [language, setLanguage] = useState<TranslationLanguage>(
    loadLanguagePreference,
  )

  const t = getTranslations(language)

  // Collaborative multi-person session hook
  const collaboration = useCollaborativeSession({
    onMenuReceived: (receivedMenu) => {
      setMenuData(receivedMenu)
      setView("menu")
    },
    onCartUpdated: (updatedItems) => {
      setCartItems(updatedItems)
    },
  })

  // Auto-join if URL contains ?session=ROOM_CODE
  const joinedCodeRef = useRef<string | null>(null)
  useEffect(() => {
    if (
      sessionQuery &&
      collaboration.status === "idle" &&
      !collaboration.isCollaborative &&
      joinedCodeRef.current !== sessionQuery
    ) {
      joinedCodeRef.current = sessionQuery
      void collaboration.joinSession(sessionQuery)
    }
  }, [
    sessionQuery,
    collaboration.status,
    collaboration.isCollaborative,
    collaboration.joinSession,
  ])

  const totalCartQty = useMemo(
    () => cartItems.reduce((sum, ci) => sum + ci.quantity, 0),
    [cartItems],
  )

  const handleMenuAnalyzed = useCallback((data: MenuData) => {
    setMenuData(data)
    setCartItems([])
    setView("menu")
  }, [])

  // Cart actions routed through collaborative session when active
  const handleAddToCart = useCallback(
    (item: MenuItem) => {
      if (collaboration.isCollaborative) {
        collaboration.dispatchAddToCart(item)
        return
      }

      setCartItems((prev) => {
        const existing = prev.find((ci) => ci.item.id === item.id)
        if (existing) {
          return prev.map((ci) =>
            ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci,
          )
        }
        return [...prev, { item, quantity: 1 }]
      })
    },
    [collaboration],
  )

  const handleDecrementCart = useCallback(
    (itemId: string) => {
      if (collaboration.isCollaborative) {
        collaboration.dispatchDecrementCart(itemId)
        return
      }

      setCartItems((prev) =>
        prev
          .map((ci) =>
            ci.item.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci,
          )
          .filter((ci) => ci.quantity > 0),
      )
    },
    [collaboration],
  )

  return (
    <div className="min-h-dvh sm:flex sm:min-h-dvh sm:items-start sm:justify-center sm:bg-gradient-to-br sm:from-amber-50/70 sm:via-stone-100 sm:to-stone-100 sm:py-8">
      {/* Mobile shell — full-screen on mobile, centred phone frame on desktop */}
      <div className="relative flex min-h-dvh w-full flex-col bg-background sm:h-[calc(100dvh-4rem)] sm:min-h-0 sm:max-w-[390px] sm:overflow-hidden sm:rounded-[2.5rem] sm:shadow-2xl sm:shadow-black/20 sm:ring-1 sm:ring-black/[0.07]">
        {/* Page content */}
        <main className="relative flex-1 overflow-hidden">
          {/* Guest joining overlay */}
          <AnimatePresence>
            {collaboration.isGuest &&
              (collaboration.status === "connecting" || collaboration.status === "error") &&
              collaboration.sessionId && (
                <JoiningSessionOverlay
                  sessionId={collaboration.sessionId}
                  status={collaboration.status}
                  errorMessage={collaboration.errorMessage}
                  onDismiss={() => {
                    collaboration.leaveSession()
                    joinedCodeRef.current = null
                    router.replace(pathname)
                  }}
                  onRetry={() => {
                    if (collaboration.sessionId) {
                      void collaboration.joinSession(collaboration.sessionId)
                    }
                  }}
                  t={t}
                />
              )}
          </AnimatePresence>

          {/* Toast Notification (e.g. "Diner B added Pan-Fried Gyoza") */}
          <AnimatePresence>
            {collaboration.toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-4 right-4 top-4 z-40 flex items-center justify-center"
              >
                <div className="rounded-full bg-foreground/90 px-4 py-2 text-xs font-medium text-background shadow-lg backdrop-blur-md">
                  {collaboration.toastMessage}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {view === "upload" && (
              <motion.div
                key="upload"
                variants={PAGE_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={PAGE_TRANSITION}
                className="absolute inset-0 overflow-y-auto"
              >
                <MenuUploadPage
                  onMenuAnalyzed={handleMenuAnalyzed}
                  language={language}
                  onLanguageChange={setLanguage}
                />
              </motion.div>
            )}

            {view === "menu" && menuData && (
              <motion.div
                key="menu"
                variants={PAGE_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={PAGE_TRANSITION}
                className="absolute inset-0 flex flex-col overflow-hidden"
              >
                <MenuBrowserPage
                  menu={menuData}
                  cartItems={cartItems}
                  onAddToCart={handleAddToCart}
                  onDecrementCart={handleDecrementCart}
                  onViewCart={() => setView("cart")}
                  language={language}
                  isCollaborative={collaboration.isCollaborative}
                  sessionStatus={collaboration.status}
                  sessionPeerCount={collaboration.peerCount}
                  onStartSession={() =>
                    collaboration.startSession(menuData, cartItems)
                  }
                  onOpenQr={() => collaboration.setQrOpen(true)}
                />
              </motion.div>
            )}

            {view === "cart" && (
              <motion.div
                key="cart"
                variants={PAGE_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={PAGE_TRANSITION}
                className="absolute inset-0 flex flex-col overflow-hidden"
              >
                <CartPage
                  cartItems={cartItems}
                  currency={menuData?.currency ?? "USD"}
                  onAddToCart={handleAddToCart}
                  onDecrementCart={handleDecrementCart}
                  onBack={() => setView("menu")}
                  language={language}
                  isCollaborative={collaboration.isCollaborative}
                  sessionStatus={collaboration.status}
                  sessionPeerCount={collaboration.peerCount}
                  onOpenQr={() => collaboration.setQrOpen(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom navigation */}
        <nav
          className="relative z-10 shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-md"
          aria-label="Main navigation"
        >
          <div className="grid h-16 grid-cols-3">
            <NavTab
              label={t.nav.scan}
              icon={<Camera className="size-5" />}
              isActive={view === "upload"}
              onClick={() => setView("upload")}
            />
            <NavTab
              label={t.nav.menu}
              icon={<UtensilsCrossed className="size-5" />}
              isActive={view === "menu"}
              onClick={() => setView("menu")}
              disabled={!menuData}
            />
            <NavTab
              label={t.nav.cart}
              isActive={view === "cart"}
              onClick={() => setView("cart")}
              icon={
                <div className="relative">
                  <ShoppingCart className="size-5" />
                  <AnimatePresence>
                    {totalCartQty > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        }}
                        className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold leading-none text-primary-foreground"
                      >
                        {totalCartQty > 99 ? "99+" : totalCartQty}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              }
            />
          </div>
        </nav>
      </div>

      {/* QR Code Drawer Modal */}
      {collaboration.sessionId && (
        <SessionQrDrawer
          open={collaboration.qrOpen}
          onOpenChange={collaboration.setQrOpen}
          sessionId={collaboration.sessionId}
          joinUrl={collaboration.joinUrl}
          peerCount={collaboration.peerCount}
          isHost={collaboration.isHost}
          t={t}
        />
      )}
    </div>
  )
}

interface NavTabProps {
  label: string
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
  disabled?: boolean
}

function NavTab({
  label,
  icon,
  isActive,
  onClick,
  disabled = false,
}: NavTabProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.93 }}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex min-h-[44px] flex-col items-center justify-center gap-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-35",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {isActive && (
        <motion.span
          layoutId={NAV_INDICATOR_ID}
          className="absolute bottom-2 h-1 w-5 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </motion.button>
  )
}
