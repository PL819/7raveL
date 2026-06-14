import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format-currency"
import { cn } from "@/lib/utils"
import type { CartItem, MenuData, MenuItem } from "@/types/menu"

interface MenuBrowserPageProps {
  menu: MenuData
  cartItems: CartItem[]
  onAddToCart: (item: MenuItem) => void
  onDecrementCart: (itemId: string) => void
  onViewCart: () => void
}

export function MenuBrowserPage({
  menu,
  cartItems,
  onAddToCart,
  onDecrementCart,
  onViewCart,
}: MenuBrowserPageProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(
    menu.categories[0]?.id ?? "",
  )

  const cartMap = useMemo(
    () => new Map(cartItems.map((ci) => [ci.item.id, ci.quantity])),
    [cartItems],
  )

  const totalCartQty = useMemo(
    () => cartItems.reduce((sum, ci) => sum + ci.quantity, 0),
    [cartItems],
  )

  const activeCategory = menu.categories.find((c) => c.id === activeCategoryId)

  return (
    <div className="flex h-full flex-col">
      {/* Page title */}
      <div className="shrink-0 px-4 pb-1 pt-5">
        <h1 className="text-xl font-semibold">Translated Menu</h1>
        {menu.sourceImageName && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {menu.sourceImageName}
          </p>
        )}
      </div>

      {/* Category tab strip */}
      <div className="shrink-0 border-b border-border/50 bg-background">
        <div
          className="flex gap-2 overflow-x-auto px-4 py-3"
          style={{ scrollbarWidth: "none" }}
          role="tablist"
          aria-label="Menu categories"
        >
          {menu.categories.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={activeCategoryId === cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={cn(
                "flex h-8 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors",
                activeCategoryId === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable item list */}
      <motion.div layout className="flex-1 overflow-y-auto px-4 py-4 pb-2">
        {activeCategory && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategoryId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-2"
            >
              {activeCategory.items.map((item) => {
                const qty = cartMap.get(item.id) ?? 0
                return (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    quantity={qty}
                    currency={menu.currency}
                    onAdd={() => onAddToCart(item)}
                    onRemove={() => onDecrementCart(item.id)}
                  />
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>

      {/* Sticky cart CTA */}
      <AnimatePresence>
        {totalCartQty > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="shrink-0 border-t border-border/50 bg-background/90 px-4 py-3 backdrop-blur-md"
          >
            <Button
              type="button"
              onClick={onViewCart}
              className="h-12 w-full gap-2.5 rounded-xl text-sm font-semibold shadow-sm"
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              View Order
              <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                {totalCartQty} {totalCartQty === 1 ? "item" : "items"}
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface MenuItemCardProps {
  item: MenuItem
  quantity: number
  currency: string
  onAdd: () => void
  onRemove: () => void
}

function MenuItemCard({
  item,
  quantity,
  currency,
  onAdd,
  onRemove,
}: MenuItemCardProps) {
  const inCart = quantity > 0

  return (
    <div
      className={cn(
        "rounded-xl border bg-card px-4 py-3 transition-colors duration-150",
        inCart && "border-primary/30 bg-primary/[0.03]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{item.englishName}</p>
          <p className="text-xs text-muted-foreground">{item.originalName}</p>
          {item.description && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}
          {item.price !== null && (
            <p className="mt-2 text-sm font-bold text-primary">
              {formatCurrency(item.price, currency)}
            </p>
          )}
        </div>

        {/* Quantity controls */}
        <div className="flex shrink-0 items-center gap-2">
          {quantity === 0 ? (
            <motion.div whileTap={{ scale: 0.92 }}>
              <Button
                type="button"
                size="icon"
                className="size-9 rounded-full"
                onClick={onAdd}
                aria-label={`Add ${item.englishName} to order`}
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2">
              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-9 rounded-full"
                  onClick={onRemove}
                  aria-label={`Remove one ${item.englishName} from order`}
                >
                  <Minus className="size-4" aria-hidden="true" />
                </Button>
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.span
                  key={quantity}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.12 }}
                  className="w-6 text-center text-sm font-bold tabular-nums"
                >
                  {quantity}
                </motion.span>
              </AnimatePresence>

              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  type="button"
                  size="icon"
                  className="size-9 rounded-full"
                  onClick={onAdd}
                  aria-label={`Add another ${item.englishName} to order`}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
