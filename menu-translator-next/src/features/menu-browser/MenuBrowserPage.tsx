"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getTranslations } from "@/lib/ui-translations"
import { formatCurrency } from "@/lib/format-currency"
import { cn } from "@/lib/utils"
import type { CartItem, MenuData, MenuItem, TranslationLanguage } from "@/types/menu"

interface MenuBrowserPageProps {
  menu: MenuData
  cartItems: CartItem[]
  onAddToCart: (item: MenuItem) => void
  onDecrementCart: (itemId: string) => void
  onViewCart: () => void
  language: TranslationLanguage
}

export function MenuBrowserPage({
  menu,
  cartItems,
  onAddToCart,
  onDecrementCart,
  onViewCart,
  language,
}: MenuBrowserPageProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(
    menu.categories[0]?.id ?? "",
  )

  const t = getTranslations(language)

  const cartMap = useMemo(
    () => new Map(cartItems.map((ci) => [ci.item.id, ci.quantity])),
    [cartItems],
  )

  const totalCartQty = useMemo(
    () => cartItems.reduce((sum, ci) => sum + ci.quantity, 0),
    [cartItems],
  )
  const sourceLabel =
    menu.sourceImageNames && menu.sourceImageNames.length > 0
      ? menu.sourceImageNames.join(" · ")
      : menu.sourceImageName

  const activeCategory = menu.categories.find((c) => c.id === activeCategoryId)

  return (
    <div className="flex h-full flex-col">
      {/* Page title */}
      <div className="shrink-0 px-4 pb-1 pt-5">
        <h1 className="text-xl font-semibold">{t.browser.title}</h1>
        {sourceLabel && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {sourceLabel}
          </p>
        )}
      </div>

      {/* Category tab strip — full 44px touch targets */}
      <div className="shrink-0 border-b border-border/50 bg-background">
        <div
          className="flex overflow-x-auto px-4"
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
                "relative flex min-h-[44px] shrink-0 items-center px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                activeCategoryId === cat.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {cat.name}
              {activeCategoryId === cat.id && (
                <motion.span
                  layoutId="category-underline"
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable item list */}
      <motion.div layout className="flex-1 overflow-y-auto px-4 py-3 pb-2">
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

      {/* Sticky View Order bar */}
      <AnimatePresence>
        {totalCartQty > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="shrink-0 border-t border-border/50 bg-background/95 px-4 py-3 backdrop-blur-md"
          >
            <Button
              type="button"
              onClick={onViewCart}
              className="h-12 w-full gap-2.5 rounded-xl text-sm font-semibold shadow-sm"
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              {t.browser.viewOrder}
              <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                {totalCartQty}{" "}
                {totalCartQty === 1 ? t.browser.item : t.browser.items}
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
    <Card
      className={cn(
        "py-0 transition-colors duration-150",
        inCart && "ring-primary/30 bg-primary/[0.03]",
      )}
    >
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">
              {item.translatedName}
            </p>
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

          {/* Quantity controls — 44px touch targets */}
          <div className="flex shrink-0 items-center gap-2">
            {quantity === 0 ? (
              <motion.div whileTap={{ scale: 0.93 }}>
                <Button
                  type="button"
                  size="icon"
                  className="size-11 rounded-full"
                  onClick={onAdd}
                  aria-label={`Add ${item.translatedName} to order`}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </Button>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5">
                <motion.div whileTap={{ scale: 0.93 }}>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-11 rounded-full"
                    onClick={onRemove}
                    aria-label={`Remove one ${item.translatedName} from order`}
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
                    className="w-7 text-center text-sm font-bold tabular-nums"
                  >
                    {quantity}
                  </motion.span>
                </AnimatePresence>

                <motion.div whileTap={{ scale: 0.93 }}>
                  <Button
                    type="button"
                    size="icon"
                    className="size-11 rounded-full"
                    onClick={onAdd}
                    aria-label={`Add another ${item.translatedName} to order`}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
