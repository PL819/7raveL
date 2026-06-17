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

const fa: UITranslations = {
  nav: {
    scan: "اسکن",
    menu: "منو",
    cart: "سفارش",
  },
  upload: {
    badge: "مترجم منو",
    headingLine1: "هر منویی را بخوانید،",
    headingLine2: "با اطمینان سفارش دهید",
    subheadingBefore: "منو را بارگذاری کنید یا از آن عکس بگیرید. ما آن را در چند ثانیه به ",
    subheadingAfter: " ترجمه می‌کنیم.",
    dismiss: "بستن",
    dropToUpload: "برای بارگذاری رها کنید",
    uploadMenuPhoto: "بارگذاری عکس منو",
    fileTypesDragging: "JPG، PNG، WebP، HEIC",
    fileTypesNormal: "بکشید و رها کنید یا کلیک کنید · JPG PNG WebP HEIC · حداکثر ۲۰ مگابایت",
    takePhoto: "عکس بگیرید",
    translatingMenu: "در حال ترجمه منو…",
    extractingDishes: "در حال استخراج غذاها…",
    translateMenu: "ترجمه منو",
    forBestResults: "برای بهترین نتیجه",
    tips: [
      "منو را روی سطح صاف و با نور مناسب قرار دهید",
      "از کل صفحه یا یک بخش واضح عکس بگیرید",
      "از بازتاب نور و سایه‌های شدید جلوگیری کنید",
    ],
    skipDemo: "رد شدن — منوی نمونه را امتحان کنید ←",
    errors: {
      unsupportedFormat: (ext) =>
        `فایل‌های ${ext} پشتیبانی نمی‌شوند. لطفاً از JPG، PNG، WebP یا HEIC استفاده کنید.`,
      fileTooLarge: "فایل بیش از حد بزرگ است. لطفاً تصویری کمتر از ۲۰ مگابایت انتخاب کنید.",
      couldNotRead: "خواندن تصویر ممکن نبود. لطفاً فایل دیگری را امتحان کنید.",
      analysisFailed: "تحلیل ناموفق بود. لطفاً دوباره تلاش کنید.",
    },
  },
  browser: {
    title: "منوی ترجمه‌شده",
    viewOrder: "مشاهده سفارش",
    item: "مورد",
    items: "مورد",
  },
  cart: {
    title: "سفارش شما",
    dish: "غذا",
    dishes: "غذا",
    emptyTitle: "سبد سفارش شما خالی است",
    emptySubtitle: "برای شروع، غذاهایی را از منو اضافه کنید.",
    browseMenu: "مشاهده منو",
    estimatedTotal: "مجموع تقریبی",
    showToWaiter: "نمایش به گارسون",
    orderSummary: "خلاصه سفارش",
    ourOrder: "سفارش ما",
    thankYou: "متشکریم 🙏",
  },
  settings: {
    title: "زبان ترجمه",
    subtitle: "منوها به زبان انتخابی شما ترجمه خواهند شد.",
  },
}

const zhTW: UITranslations = {
  nav: {
    scan: "影啦",
    menu: "餐牌",
    cart: "你堆嘢",
  },
  upload: {
    badge: "盲毛救星",
    headingLine1: "睇唔明餐牌？",
    headingLine2: "咁就唔好亂叫喇。",
    subheadingBefore: "影張餐牌畀我，我幫你譯做 ",
    subheadingAfter: "，廢事你出醜。",
    dismiss: "收聲啦",
    dropToUpload: "掉過嚟啦",
    uploadMenuPhoto: "Send 張餐牌相嚟",
    fileTypesDragging: "JPG、PNG、WebP、HEIC",
    fileTypesNormal: "JPG, PNG, WebP, HEIC · 唔好超過 20 MB",
    takePhoto: "快啲影",
    translatingMenu: "做緊野 你唔好吹我…",
    extractingDishes: "搵緊啲餸名出嚟…",
    translateMenu: "譯啦",
    forBestResults: "想冇咁易炒車嘅話",
    tips: [
      "張餐牌放平啲，唔好影到似案發現場",
      "影完整頁，唔好剩係影個角",
      "避開反光，唔係鬼睇到咩",
    ],
    skipDemo: "Demo",
    errors: {
      unsupportedFormat: (ext) =>
        `${ext}？你認真㗎？用 JPG、PNG、WebP 或 HEIC 啦。`,
      fileTooLarge: "張圖肥到爆。20 MB 以下先再試。",
      couldNotRead: "呢張相影成咁，我真係睇唔明。",
      analysisFailed: "炒車喇，再試過啦。",
    },
  },
  browser: {
    title: "餐牌翻譯",
    viewOrder: "睇下自己叫咗咩",
    item: "項",
    items: "項",
  },
  cart: {
    title: "你叫嘅嘢",
    dish: "款",
    dishes: "款",
    emptyTitle: "乜都冇",
    emptySubtitle: "一樣都未叫，你想食空氣？",
    browseMenu: "返去睇餐牌",
    estimatedTotal: "埋單大概",
    showToWaiter: "畀伙記睇",
    orderSummary: "你嘅傑作",
    ourOrder: "我哋叫呢啲",
    thankYou: "多謝幫襯，希望你冇叫錯嘢 🙏",
  },
  settings: {
    title: "譯做咩語言？",
    subtitle: "餐牌會譯成你揀嘅語言。",
  },
}

export const TRANSLATIONS: Record<TranslationLanguage, UITranslations> = {
  en,
  "zh-TW": zhTW,
  fa
}

export function getTranslations(lang: TranslationLanguage): UITranslations {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en
}
