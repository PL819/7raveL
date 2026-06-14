import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type MenuItem = {
  id: string
  name: string
  note: string
  category: "Mains" | "Small Plates" | "Drinks"
  price: number
}

const sampleItems: MenuItem[] = [
  {
    id: "miso-ramen",
    name: "Miso Ramen",
    note: "Rich pork broth, spring onion, nori",
    category: "Mains",
    price: 13.5,
  },
  {
    id: "gyoza",
    name: "Pan-Fried Gyoza",
    note: "Pork dumplings with soy-vinegar dip",
    category: "Small Plates",
    price: 7,
  },
  {
    id: "yuzu-soda",
    name: "Yuzu Soda",
    note: "Citrus sparkle, lightly sweet",
    category: "Drinks",
    price: 4.5,
  },
]

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

function App() {
  const [query, setQuery] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [translatedItems, setTranslatedItems] = useState<MenuItem[]>([])

  const filteredItems = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return translatedItems

    return translatedItems.filter((item) => {
      return (
        item.name.toLowerCase().includes(value) ||
        item.note.toLowerCase().includes(value) ||
        item.category.toLowerCase().includes(value)
      )
    })
  }, [query, translatedItems])

  const cartTotal = useMemo(
    () => translatedItems.reduce((acc, item) => acc + item.price, 0),
    [translatedItems]
  )

  const startAnalysis = () => {
    setIsAnalyzing(true)
    setAnalysisError(null)

    window.setTimeout(() => {
      setTranslatedItems(sampleItems)
      setIsAnalyzing(false)
    }, 1500)
  }

  const simulateError = () => {
    setIsAnalyzing(true)
    setAnalysisError(null)

    window.setTimeout(() => {
      setIsAnalyzing(false)
      setAnalysisError(
        "We could not read this photo clearly. Try better lighting or retake from a closer angle."
      )
    }, 1100)
  }

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-[radial-gradient(circle_at_top_right,oklch(0.93_0.09_95)_0%,transparent_52%),radial-gradient(circle_at_bottom_left,oklch(0.91_0.12_180)_0%,transparent_46%),var(--background)] px-4 py-6 sm:px-6">
      <motion.div
        className="mx-auto flex w-full max-w-3xl flex-col gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
      >
        <Card className="border-0 bg-linear-to-br from-white/96 via-white/90 to-white/75 shadow-xl shadow-amber-950/10 backdrop-blur">
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Badge className="h-6 bg-amber-500 text-amber-950">Menu Translator</Badge>
                <CardTitle className="text-2xl font-semibold leading-tight text-balance sm:text-3xl">
                  Read any menu photo, then order in clear English.
                </CardTitle>
                <CardDescription className="max-w-prose text-[15px] leading-6">
                  Capture or upload a menu image to get translated dishes and a
                  quick order summary in seconds.
                </CardDescription>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-100/60 p-2 text-amber-700">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
            </div>
          </CardHeader>
          <CardFooter className="flex-wrap justify-between gap-2 bg-white/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              OCR + translation + cart flow
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="size-4 text-sky-600" aria-hidden="true" />
              Typical analysis in 5-10 seconds
            </div>
          </CardFooter>
        </Card>

        <Tabs defaultValue="scan" className="gap-3">
          <TabsList className="grid h-11 w-full grid-cols-3 rounded-xl bg-white/70 p-1 shadow-sm ring-1 ring-black/5">
            <TabsTrigger value="scan">Scan</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="cart">Cart</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <Card className="border-0 bg-white/90 shadow-lg shadow-amber-950/8 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="size-4 text-amber-600" aria-hidden="true" />
                  Upload a menu photo
                </CardTitle>
                <CardDescription>
                  Best results come from high contrast and straight-on framing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-36 w-full rounded-2xl border-dashed border-amber-300 bg-amber-50/60 text-sm"
                >
                  <span className="flex flex-col items-center gap-2">
                    <Camera className="size-5" aria-hidden="true" />
                    Tap to upload image
                  </span>
                </Button>

                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter translated dishes or add a quick note"
                  className="h-11 bg-white"
                  aria-label="Dish search or note"
                />

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    className="h-11 flex-1"
                    onClick={startAnalysis}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" aria-hidden="true" />
                        Analyze Menu
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11"
                    onClick={simulateError}
                    disabled={isAnalyzing}
                  >
                    Simulate error
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  {isAnalyzing && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-2"
                    >
                      <Alert>
                        <LoaderCircle className="animate-spin" aria-hidden="true" />
                        <AlertTitle>Reading your photo</AlertTitle>
                        <AlertDescription>
                          Extracting dishes, prices, and notes...
                        </AlertDescription>
                      </Alert>
                      <Skeleton className="h-10 w-full rounded-xl" />
                      <Skeleton className="h-10 w-[86%] rounded-xl" />
                      <Skeleton className="h-10 w-[72%] rounded-xl" />
                    </motion.div>
                  )}

                  {!isAnalyzing && analysisError && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Alert variant="destructive">
                        <AlertCircle aria-hidden="true" />
                        <AlertTitle>Image scan failed</AlertTitle>
                        <AlertDescription>{analysisError}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu">
            <Card className="border-0 bg-white/90 shadow-lg shadow-amber-950/8 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">Translated menu</CardTitle>
                <CardDescription>
                  Clean dish names, short notes, and easy category browsing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {translatedItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/35 px-4 py-10 text-center">
                    <UtensilsCrossed
                      className="mx-auto mb-3 size-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium">No translated dishes yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Run analysis from Scan to populate menu results.
                    </p>
                  </div>
                ) : (
                  <motion.div
                    className="space-y-2"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.06 } },
                    }}
                  >
                    {filteredItems.map((item) => (
                      <motion.div
                        key={item.id}
                        variants={{
                          hidden: { opacity: 0, y: 8 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        className="rounded-xl border bg-white px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.note}
                            </p>
                          </div>
                          <div className="text-sm font-medium text-amber-700">
                            {formatPrice(item.price)}
                          </div>
                        </div>
                        <Badge variant="outline" className="mt-2">
                          {item.category}
                        </Badge>
                      </motion.div>
                    ))}

                    {!filteredItems.length && (
                      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No matches for your filter.
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cart">
            <Card className="border-0 bg-white/90 shadow-lg shadow-amber-950/8 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">Order summary</CardTitle>
                <CardDescription>
                  Review selected dishes before placing your order.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {!translatedItems.length && (
                  <p className="rounded-xl bg-muted/35 px-3 py-8 text-center text-sm text-muted-foreground">
                    Your cart is empty. Add dishes from translated menu results.
                  </p>
                )}

                {translatedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border bg-white px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <p className="text-sm font-medium">{formatPrice(item.price)}</p>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-2 bg-white/60">
                <div>
                  <p className="text-xs text-muted-foreground">Estimated total</p>
                  <p className="text-base font-semibold">{formatPrice(cartTotal)}</p>
                </div>
                <Button className="h-11 min-w-32" disabled={!translatedItems.length}>
                  Place Order
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </main>
  )
}

export default App
