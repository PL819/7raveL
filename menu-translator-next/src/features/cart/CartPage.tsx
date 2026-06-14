"use client"

import { useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingCart, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { getTranslations } from "@/lib/ui-translations"
import { formatCurrency } from "@/lib/format-currency"
import type { CartItem, MenuItem, TranslationLanguage } from "@/types/menu"

interface CartPageProps {
  cartItems: CartItem[]
  currency: string
  onAddToCart: (item: MenuItem) => void
  onDecrementCart: (itemId: string) => void
  onBack: () => void
  language: TranslationLanguage
}

export function CartPage({
  cartItems,
  currency,
  onAddToCart,
  onDecrementCart,
  onBack,
  language,
}: CartPageProps) {
  const t = getTranslations(language)
  const subtotal = useMemo(
    () =>
      cartItems.reduce((sum, ci) => {
        if (ci.item.price === null) return sum
        return sum + ci.item.price * ci.quantity
      }, 0),
    [cartItems],
  )

  const totalQty = useMemo(
    () => cartItems.reduce((sum, ci) => sum + ci.quantity, 0),
    [cartItems],
  )

  const isEmpty = cartItems.length === 0

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Page heading */}
        <div className="px-4 pb-3 pt-5">
          <h1 className="text-xl font-semibold">{t.cart.title}</h1>
          {!isEmpty && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {totalQty} {totalQty === 1 ? t.cart.dish : t.cart.dishes}
            </p>
          )}
        </div>

        {/* Empty state */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-muted/40">
              <ShoppingCart
                className="size-9 text-muted-foreground/50"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-semibold">{t.cart.emptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.cart.emptySubtitle}
              </p>
            </div>
            <Button
              variant="outline"
              className="h-11 px-8"
              onClick={onBack}
            >
              {t.cart.browseMenu}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 px-4 pb-4">
            <AnimatePresence initial={false}>
              {cartItems.map((ci) => (
                <motion.div
                  key={ci.item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card className="py-0">
                    <CardContent className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {ci.item.translatedName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ci.item.originalName}
                          </p>
                        </div>

                        {/* Qty controls — 44px touch targets */}
                        <div className="flex shrink-0 items-center gap-1.5">
                          <motion.div whileTap={{ scale: 0.93 }}>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="size-11 rounded-full"
                              onClick={() => onDecrementCart(ci.item.id)}
                              aria-label={`Remove one ${ci.item.translatedName}`}
                            >
                              <Minus className="size-3.5" aria-hidden="true" />
                            </Button>
                          </motion.div>

                          <AnimatePresence mode="wait">
                            <motion.span
                              key={ci.quantity}
                              initial={{ opacity: 0, scale: 0.6 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.6 }}
                              transition={{ duration: 0.12 }}
                              className="w-6 text-center text-sm font-bold tabular-nums"
                            >
                              {ci.quantity}
                            </motion.span>
                          </AnimatePresence>

                          <motion.div whileTap={{ scale: 0.93 }}>
                            <Button
                              type="button"
                              size="icon"
                              className="size-11 rounded-full"
                              onClick={() => onAddToCart(ci.item)}
                              aria-label={`Add another ${ci.item.translatedName}`}
                            >
                              <Plus className="size-3.5" aria-hidden="true" />
                            </Button>
                          </motion.div>
                        </div>

                        {/* Line total */}
                        {ci.item.price !== null && (
                          <p className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-primary">
                            {formatCurrency(
                              ci.item.price * ci.quantity,
                              currency,
                            )}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sticky bottom bar — total + CTA */}
      {!isEmpty && (
        <div className="shrink-0 border-t border-border/60 bg-background px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t.cart.estimatedTotal}
            </span>
            <span className="text-lg font-bold tabular-nums">
              {formatCurrency(subtotal, currency)}
            </span>
          </div>

          <Drawer>
            <DrawerTrigger asChild>
              <Button
                type="button"
                className="h-12 w-full gap-2 rounded-xl text-[15px] font-semibold"
              >
                <Users className="size-4" aria-hidden="true" />
                {t.cart.showToWaiter}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{t.cart.orderSummary}</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto">
                <WaiterView
                  cartItems={cartItems}
                  currency={currency}
                  subtotal={subtotal}
                  t={t.cart}
                />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      )}
    </div>
  )
}

interface WaiterViewProps {
  cartItems: CartItem[]
  currency: string
  subtotal: number
  t: ReturnType<typeof getTranslations>["cart"]
}

function WaiterView({ cartItems, currency, subtotal, t }: WaiterViewProps) {
  return (
    <div className="px-6 pb-10">
      {/* Receipt header */}
      <div className="mb-6 flex flex-col items-center gap-1 text-center">
        <span className="text-4xl" role="img" aria-label="food">
          🍜
        </span>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t.ourOrder}
        </p>
      </div>

      {/* Items */}
      <div className="space-y-0">
        {cartItems.map((ci, i) => (
          <div key={ci.item.id}>
            <div className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold leading-snug">
                  {ci.item.translatedName}
                </p>
                <p className="mt-0.5 text-base text-muted-foreground">
                  {ci.item.originalName}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold">x{ci.quantity}</p>
                {ci.item.price !== null && (
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(ci.item.price * ci.quantity, currency)}
                  </p>
                )}
              </div>
            </div>
            {i < cartItems.length - 1 && (
              <div className="border-t border-border/40" />
            )}
          </div>
        ))}
      </div>

      {/* Total row */}
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3.5">
        <span className="text-sm font-medium text-muted-foreground">
          {t.estimatedTotal}
        </span>
        <span className="text-2xl font-bold tabular-nums">
          {formatCurrency(subtotal, currency)}
        </span>
      </div>

      {/* Polite closer */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.thankYou}
      </p>
    </div>
  )
}
