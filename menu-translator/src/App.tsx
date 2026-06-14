import { useCallback, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Camera, ShoppingCart, UtensilsCrossed } from "lucide-react"

import { CartPage } from "@/features/cart/CartPage"
import { MenuBrowserPage } from "@/features/menu-browser/MenuBrowserPage"
import { MenuUploadPage } from "@/features/menu-upload/MenuUploadPage"
import { cn } from "@/lib/utils"
import type { CartItem, MenuData, MenuItem, ViewState } from "@/types/menu"

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
} as const

const PAGE_TRANSITION = { duration: 0.2, ease: "easeInOut" as const }

export default function App() {
  const [view, setView] = useState<ViewState>("upload")
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  const totalCartQty = useMemo(
    () => cartItems.reduce((sum, ci) => sum + ci.quantity, 0),
    [cartItems],
  )

  const handleMenuAnalyzed = useCallback((data: MenuData) => {
    setMenuData(data)
    setCartItems([])
    setView("menu")
  }, [])

  const handleAddToCart = useCallback((item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id)
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci,
        )
      }
      return [...prev, { item, quantity: 1 }]
    })
  }, [])

  const handleDecrementCart = useCallback((itemId: string) => {
    setCartItems((prev) =>
      prev
        .map((ci) =>
          ci.item.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci,
        )
        .filter((ci) => ci.quantity > 0),
    )
  }, [])

  return (
    <div className="min-h-dvh bg-stone-200 sm:flex sm:items-start sm:justify-center">
      {/* Mobile shell — full screen on mobile, centred card on desktop */}
      <div className="relative flex min-h-dvh w-full flex-col bg-background sm:max-w-[430px] sm:shadow-2xl sm:shadow-black/20">
        {/* Page content */}
        <main className="relative flex-1 overflow-hidden">
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
                <MenuUploadPage onMenuAnalyzed={handleMenuAnalyzed} />
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
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom navigation */}
        <nav
          className="relative z-10 shrink-0 border-t border-border/60 bg-background/90 backdrop-blur-md"
          aria-label="Main navigation"
        >
          <div className="grid h-16 grid-cols-3">
            <NavTab
              label="Scan"
              icon={<Camera className="size-5" />}
              isActive={view === "upload"}
              onClick={() => setView("upload")}
            />
            <NavTab
              label="Menu"
              icon={<UtensilsCrossed className="size-5" />}
              isActive={view === "menu"}
              onClick={() => setView("menu")}
              disabled={!menuData}
            />
            <NavTab
              label="Cart"
              isActive={view === "cart"}
              onClick={() => setView("cart")}
              icon={
                <div className="relative">
                  <ShoppingCart className="size-5" />
                  {totalCartQty > 0 && (
                    <motion.span
                      key={totalCartQty}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold leading-none text-primary-foreground"
                    >
                      {totalCartQty > 99 ? "99+" : totalCartQty}
                    </motion.span>
                  )}
                </div>
              }
            />
          </div>
        </nav>
      </div>
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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-[44px] flex-col items-center justify-center gap-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-35",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

