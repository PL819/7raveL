import { useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingCart, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { formatCurrency } from "@/lib/format-currency"
import type { CartItem, MenuItem } from "@/types/menu"

interface CartPageProps {
  cartItems: CartItem[]
  currency: string
  onAddToCart: (item: MenuItem) => void
  onDecrementCart: (itemId: string) => void
  onBack: () => void
}

export function CartPage({
  cartItems,
  currency,
  onAddToCart,
  onDecrementCart,
  onBack,
}: CartPageProps) {
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
        <div className="px-4 pb-2 pt-5">
          <h1 className="text-xl font-semibold">Your Order</h1>
          {!isEmpty && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {totalQty} {totalQty === 1 ? "dish" : "dishes"}
            </p>
          )}
        </div>

        {/* Empty state */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="rounded-2xl bg-muted/30 p-5">
              <ShoppingCart
                className="size-10 text-muted-foreground/50"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-semibold">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add dishes from the menu to get started.
              </p>
            </div>
            <Button variant="outline" className="h-11 px-6" onClick={onBack}>
              Browse Menu
            </Button>
          </div>
        ) : (
          <div className="space-y-2 px-4 pb-4 pt-2">
            <AnimatePresence initial={false}>
              {cartItems.map((ci) => (
                <motion.div
                  key={ci.item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {ci.item.englishName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ci.item.originalName}
                    </p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex shrink-0 items-center gap-2">
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8 rounded-full"
                        onClick={() => onDecrementCart(ci.item.id)}
                        aria-label={`Remove one ${ci.item.englishName}`}
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
                        className="w-5 text-center text-sm font-bold tabular-nums"
                      >
                        {ci.quantity}
                      </motion.span>
                    </AnimatePresence>

                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        type="button"
                        size="icon"
                        className="size-8 rounded-full"
                        onClick={() => onAddToCart(ci.item)}
                        aria-label={`Add another ${ci.item.englishName}`}
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                      </Button>
                    </motion.div>
                  </div>

                  {/* Line total */}
                  {ci.item.price !== null && (
                    <p className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-primary">
                      {formatCurrency(ci.item.price * ci.quantity, currency)}
                    </p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom bar: total + CTA */}
      {!isEmpty && (
        <div className="shrink-0 border-t border-border/60 bg-background px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Estimated total
            </span>
            <span className="text-lg font-bold tabular-nums">
              {formatCurrency(subtotal, currency)}
            </span>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                className="h-12 w-full gap-2 rounded-xl text-[15px] font-semibold"
              >
                <Users className="size-4" aria-hidden="true" />
                Show to Waiter
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader className="pb-2">
                <SheetTitle className="text-base font-semibold">
                  Order Summary
                </SheetTitle>
              </SheetHeader>
              <WaiterView
                cartItems={cartItems}
                currency={currency}
                subtotal={subtotal}
              />
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  )
}

interface WaiterViewProps {
  cartItems: CartItem[]
  currency: string
  subtotal: number
}

function WaiterView({ cartItems, currency, subtotal }: WaiterViewProps) {
  return (
    <div className="px-4 pb-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Our order
      </p>

      <div className="space-y-4">
        {cartItems.map((ci) => (
          <div key={ci.item.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold leading-tight">
                {ci.item.englishName}
              </p>
              <p className="mt-0.5 text-base text-muted-foreground">
                {ci.item.originalName}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold">×{ci.quantity}</p>
              {ci.item.price !== null && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(ci.item.price * ci.quantity, currency)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
        <p className="text-base text-muted-foreground">Total</p>
        <p className="text-2xl font-bold tabular-nums">
          {formatCurrency(subtotal, currency)}
        </p>
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Thank you — we'd like to order these dishes 🙏
      </p>
    </div>
  )
}
