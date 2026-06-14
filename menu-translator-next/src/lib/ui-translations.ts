import type { TranslationLanguage } from "@/types/menu"

export interface UITranslations {
  nav: {
    scan: string
    menu: string
    cart: string
  }
  upload: {
    badge: string
    headingLine1: string
    headingLine2: string
    subheadingBefore: string
    subheadingAfter: string
    dismiss: string
    dropToUpload: string
    uploadMenuPhoto: string
    fileTypesDragging: string
    fileTypesNormal: string
    takePhoto: string
    translatingMenu: string
    extractingDishes: string
    translateMenu: string
    forBestResults: string
    tips: [string, string, string]
    skipDemo: string
    errors: {
      unsupportedFormat: (ext: string) => string
      fileTooLarge: string
      couldNotRead: string
      analysisFailed: string
    }
  }
  browser: {
    title: string
    viewOrder: string
    item: string
    items: string
  }
  cart: {
    title: string
    dish: string
    dishes: string
    emptyTitle: string
    emptySubtitle: string
    browseMenu: string
    estimatedTotal: string
    showToWaiter: string
    orderSummary: string
    ourOrder: string
    thankYou: string
  }
  settings: {
    title: string
    subtitle: string
  }
}

const en: UITranslations = {
  nav: {
    scan: "Scan",
    menu: "Menu",
    cart: "Cart",
  },
  upload: {
    badge: "Menu Translator",
    headingLine1: "Read any menu,",
    headingLine2: "order with confidence",
    subheadingBefore: "Upload or photograph a menu. We'll translate it into ",
    subheadingAfter: " in seconds.",
    dismiss: "Dismiss",
    dropToUpload: "Drop to upload",
    uploadMenuPhoto: "Upload menu photo",
    fileTypesDragging: "JPG, PNG, WebP, HEIC",
    fileTypesNormal: "Drag & drop, or click · JPG PNG WebP HEIC · max 20 MB",
    takePhoto: "Take a photo",
    translatingMenu: "Translating menu…",
    extractingDishes: "Extracting dishes…",
    translateMenu: "Translate Menu",
    forBestResults: "For best results",
    tips: [
      "Lay the menu flat with even lighting",
      "Capture the full page or one clear section",
      "Avoid glare and heavy shadows",
    ],
    skipDemo: "Skip — try with demo menu →",
    errors: {
      unsupportedFormat: (ext) =>
        `${ext} files aren't supported. Please use JPG, PNG, WebP, or HEIC.`,
      fileTooLarge: "File is too large. Please use an image under 20 MB.",
      couldNotRead: "Could not read the image. Please try another file.",
      analysisFailed: "Analysis failed. Please try again.",
    },
  },
  browser: {
    title: "Translated Menu",
    viewOrder: "View Order",
    item: "item",
    items: "items",
  },
  cart: {
    title: "Your Order",
    dish: "dish",
    dishes: "dishes",
    emptyTitle: "Your cart is empty",
    emptySubtitle: "Add dishes from the menu to get started.",
    browseMenu: "Browse Menu",
    estimatedTotal: "Estimated total",
    showToWaiter: "Show to Waiter",
    orderSummary: "Order Summary",
    ourOrder: "Our order",
    thankYou: "ありがとうございます — Thank you 🙏",
  },
  settings: {
    title: "Translation language",
    subtitle: "Menus will be translated into your chosen language.",
  },
}

const zhTW: UITranslations = {
  nav: {
    scan: "掃描",
    menu: "菜單",
    cart: "購物車",
  },
  upload: {
    badge: "菜單翻譯器",
    headingLine1: "閱讀任何菜單，",
    headingLine2: "放心點餐",
    subheadingBefore: "拍攝或上傳菜單，我們將在幾秒鐘內翻譯成 ",
    subheadingAfter: "。",
    dismiss: "關閉",
    dropToUpload: "拖放以上傳",
    uploadMenuPhoto: "上傳菜單照片",
    fileTypesDragging: "JPG、PNG、WebP、HEIC",
    fileTypesNormal: "拖放或點擊 · JPG PNG WebP HEIC · 最大 20 MB",
    takePhoto: "拍照",
    translatingMenu: "正在翻譯菜單…",
    extractingDishes: "正在提取菜品…",
    translateMenu: "翻譯菜單",
    forBestResults: "最佳效果",
    tips: [
      "將菜單平放，確保均勻照明",
      "拍攝完整頁面或清晰的一個部分",
      "避免眩光和濃重陰影",
    ],
    skipDemo: "跳過 — 使用示範菜單 →",
    errors: {
      unsupportedFormat: (ext) =>
        `不支援 ${ext} 格式。請使用 JPG、PNG、WebP 或 HEIC。`,
      fileTooLarge: "檔案過大。請使用小於 20 MB 的圖片。",
      couldNotRead: "無法讀取圖片。請嘗試其他檔案。",
      analysisFailed: "分析失敗。請重試。",
    },
  },
  browser: {
    title: "翻譯菜單",
    viewOrder: "查看訂單",
    item: "項",
    items: "項",
  },
  cart: {
    title: "您的點餐",
    dish: "道菜",
    dishes: "道菜",
    emptyTitle: "購物車是空的",
    emptySubtitle: "從菜單中添加菜品以開始點餐。",
    browseMenu: "瀏覽菜單",
    estimatedTotal: "預計總額",
    showToWaiter: "顯示給服務員",
    orderSummary: "訂單摘要",
    ourOrder: "我們的點餐",
    thankYou: "謝謝光臨 🙏",
  },
  settings: {
    title: "翻譯語言",
    subtitle: "菜單將翻譯成您選擇的語言。",
  },
}

export const TRANSLATIONS: Record<TranslationLanguage, UITranslations> = {
  en,
  "zh-TW": zhTW,
}

export function getTranslations(lang: TranslationLanguage): UITranslations {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en
}
