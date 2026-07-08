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
      tooManyFiles: (max: number) => string
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
    uploadMenuPhoto: "Upload menu photos",
    fileTypesDragging: "JPG, PNG, WebP, HEIC",
    fileTypesNormal:
      "Drag & drop, or click · up to 5 images · JPG PNG WebP HEIC · max 20 MB each",
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
      tooManyFiles: (max) => `You can upload up to ${max} images at a time.`,
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
    uploadMenuPhoto: "بارگذاری عکس‌های منو",
    fileTypesDragging: "JPG، PNG، WebP، HEIC",
    fileTypesNormal:
      "بکشید و رها کنید یا کلیک کنید · حداکثر ۵ تصویر · JPG PNG WebP HEIC · هر کدام حداکثر ۲۰ مگابایت",
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
      tooManyFiles: (max) => `می‌توانید حداکثر ${max} تصویر را هم‌زمان بارگذاری کنید.`,
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
    uploadMenuPhoto: "一次過 Send 幾張餐牌相嚟",
    fileTypesDragging: "JPG、PNG、WebP、HEIC",
    fileTypesNormal:
      "最多 5 張 · JPG, PNG, WebP, HEIC · 每張唔好超過 20 MB",
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
      tooManyFiles: (max) => `一次最多 ${max} 張，你貪心都有限度啦。`,
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

const ru: UITranslations = {
  nav: {
    scan: "Сканировать",
    menu: "Меню",
    cart: "Корзина",
  },
  upload: {
    badge: "Переводчик меню",
    headingLine1: "Читайте любое меню,",
    headingLine2: "заказывайте уверенно",
    subheadingBefore: "Загрузите меню или сфотографируйте его. Мы переведём его на ",
    subheadingAfter: " за несколько секунд.",
    dismiss: "Закрыть",
    dropToUpload: "Отпустите, чтобы загрузить",
    uploadMenuPhoto: "Загрузить фото меню",
    fileTypesDragging: "JPG, PNG, WebP, HEIC",
    fileTypesNormal:
      "Перетащите файл сюда или нажмите · до 5 изображений · JPG PNG WebP HEIC · максимум 20 МБ каждое",
    takePhoto: "Сделать фото",
    translatingMenu: "Переводим меню…",
    extractingDishes: "Извлекаем блюда…",
    translateMenu: "Перевести меню",
    forBestResults: "Для лучших результатов",
    tips: [
      "Положите меню ровно при равномерном освещении",
      "Снимите всю страницу или один чёткий раздел",
      "Избегайте бликов и глубоких теней",
    ],
    skipDemo: "Пропустить — попробовать демо-меню →",
    errors: {
      unsupportedFormat: (ext) =>
        `${ext} не поддерживается. Используйте JPG, PNG, WebP или HEIC.`,
      fileTooLarge: "Файл слишком большой. Используйте изображение до 20 МБ.",
      tooManyFiles: (max) => `Можно загрузить до ${max} изображений за один раз.`,
      couldNotRead: "Не удалось прочитать изображение. Попробуйте другой файл.",
      analysisFailed: "Анализ не удался. Попробуйте ещё раз.",
    },
  },
  browser: {
    title: "Переведённое меню",
    viewOrder: "Посмотреть заказ",
    item: "позиция",
    items: "позиций",
  },
  cart: {
    title: "Ваш заказ",
    dish: "блюдо",
    dishes: "блюд",
    emptyTitle: "Ваша корзина пуста",
    emptySubtitle: "Добавьте блюда из меню, чтобы начать.",
    browseMenu: "Просмотреть меню",
    estimatedTotal: "Примерная сумма",
    showToWaiter: "Показать официанту",
    orderSummary: "Сводка заказа",
    ourOrder: "Наш заказ",
    thankYou: "Спасибо 🙏",
  },
  settings: {
    title: "Язык перевода",
    subtitle: "Меню будут переводиться на выбранный вами язык.",
  },
}

const si: UITranslations = {
  nav: {
    scan: "ස්කෑන් කරන්න",
    menu: "මෙනුව",
    cart: "කූඩය",
  },
  upload: {
    badge: "මෙනු පරිවර්තකය",
    headingLine1: "ඕනෑම මෙනුවක් කියවන්න,",
    headingLine2: "විශ්වාසයෙන් ඇණවුම් කරන්න",
    subheadingBefore:
      "මෙනුවක් උඩුගත කරන්න හෝ ඡායාරූපගත කරන්න. අපි එය තත්පර කිහිපයකින් ",
    subheadingAfter: " භාෂාවට පරිවර්තනය කරන්නෙමු.",
    dismiss: "වසා දමන්න",
    dropToUpload: "උඩුගත කිරීමට අතහරින්න",
    uploadMenuPhoto: "මෙනු ඡායාරූප කිහිපයක් උඩුගත කරන්න",
    fileTypesDragging: "JPG, PNG, WebP, HEIC",
    fileTypesNormal:
      "ඇද දමන්න, නැතහොත් ක්ලික් කරන්න · උපරිම රූප 5ක් · JPG PNG WebP HEIC · එක් රූපයක් 20 MB ට අඩු විය යුතුය",
    takePhoto: "ඡායාරූපයක් ගන්න",
    translatingMenu: "මෙනුව පරිවර්තනය වෙමින්…",
    extractingDishes: "කෑම වර්ග හඳුනා ගනිමින්…",
    translateMenu: "මෙනුව පරිවර්තනය කරන්න",
    forBestResults: "හොඳම ප්‍රතිඵල සඳහා",
    tips: [
      "මෙනුව සමතලව තබා සමාන ආලෝකයක් ලබා දෙන්න",
      "සම්පූර්ණ පිටුව හෝ පැහැදිලි කොටසක් ගන්න",
      "දිලිසීම සහ තද සෙවණැලි වලින් වළකින්න",
    ],
    skipDemo: "මඟහරින්න — නිරූපණ මෙනුවෙන් උත්සාහ කරන්න →",
    errors: {
      unsupportedFormat: (ext) =>
        `${ext} ගොනු සඳහා සහය නොදක්වයි. කරුණාකර JPG, PNG, WebP, හෝ HEIC භාවිත කරන්න.`,
      fileTooLarge:
        "ගොනුව විශාල වැඩිය. කරුණාකර 20 MB ට අඩු රූපයක් භාවිත කරන්න.",
      tooManyFiles: (max) =>
        `එකවර උඩුගත කළ හැක්කේ උපරිම රූප ${max} ක් පමණි.`,
      couldNotRead:
        "රූපය කියවිය නොහැකි විය. කරුණාකර වෙනත් ගොනුවක් උත්සාහ කරන්න.",
      analysisFailed: "විශ්ලේෂණය අසාර්ථක විය. කරුණාකර නැවත උත්සාහ කරන්න.",
    },
  },
  browser: {
    title: "පරිවර්තිත මෙනුව",
    viewOrder: "ඇණවුම බලන්න",
    item: "අයිතමය",
    items: "අයිතම",
  },
  cart: {
    title: "ඔබගේ ඇණවුම",
    dish: "කෑම වර්ගය",
    dishes: "කෑම වර්ග",
    emptyTitle: "ඔබගේ කූඩය හිස්",
    emptySubtitle: "ආරම්භ කිරීමට මෙනුවෙන් කෑම වර්ග එකතු කරන්න.",
    browseMenu: "මෙනුව බලන්න",
    estimatedTotal: "ඇස්තමේන්තු මුළු එකතුව",
    showToWaiter: "වේටර්වරයාට පෙන්වන්න",
    orderSummary: "ඇණවුම් සාරාංශය",
    ourOrder: "අපගේ ඇණවුම",
    thankYou: "ස්තුතියි 🙏",
  },
  settings: {
    title: "පරිවර්තන භාෂාව",
    subtitle: "මෙනු ඔබ තෝරාගත් භාෂාවට පරිවර්තනය කරනු ලැබේ.",
  },
}

const hi: UITranslations = {
  nav: {
    scan: "स्कैन करें",
    menu: "मेनू",
    cart: "कार्ट",
  },
  upload: {
    badge: "मेनू अनुवादक",
    headingLine1: "कोई भी मेनू पढ़ें,",
    headingLine2: "आत्मविश्वास से ऑर्डर करें",
    subheadingBefore:
      "मेनू अपलोड करें या उसकी फ़ोटो लें। हम इसे कुछ सेकंड में ",
    subheadingAfter: " में अनुवाद कर देंगे।",
    dismiss: "बंद करें",
    dropToUpload: "अपलोड करने के लिए छोड़ें",
    uploadMenuPhoto: "मेनू की फ़ोटो अपलोड करें",
    fileTypesDragging: "JPG, PNG, WebP, HEIC",
    fileTypesNormal:
      "खींचकर छोड़ें, या क्लिक करें · अधिकतम 5 चित्र · JPG PNG WebP HEIC · प्रत्येक 20 MB तक",
    takePhoto: "फ़ोटो लें",
    translatingMenu: "मेनू का अनुवाद हो रहा है…",
    extractingDishes: "व्यंजन निकाले जा रहे हैं…",
    translateMenu: "मेनू का अनुवाद करें",
    forBestResults: "बेहतर परिणामों के लिए",
    tips: [
      "मेनू को सपाट रखें और रोशनी बराबर रखें",
      "पूरा पेज या एक साफ़ सेक्शन कैप्चर करें",
      "चमक और गहरी छाया से बचें",
    ],
    skipDemo: "छोड़ें — डेमो मेनू से आज़माएँ →",
    errors: {
      unsupportedFormat: (ext) =>
        `${ext} फ़ाइलें समर्थित नहीं हैं। कृपया JPG, PNG, WebP, या HEIC का उपयोग करें।`,
      fileTooLarge:
        "फ़ाइल बहुत बड़ी है। कृपया 20 MB से छोटी छवि का उपयोग करें।",
      tooManyFiles: (max) =>
        `आप एक बार में अधिकतम ${max} चित्र अपलोड कर सकते हैं।`,
      couldNotRead:
        "छवि पढ़ी नहीं जा सकी। कृपया कोई दूसरी फ़ाइल आज़माएँ।",
      analysisFailed: "विश्लेषण विफल रहा। कृपया फिर से कोशिश करें।",
    },
  },
  browser: {
    title: "अनुवादित मेनू",
    viewOrder: "ऑर्डर देखें",
    item: "आइटम",
    items: "आइटम",
  },
  cart: {
    title: "आपका ऑर्डर",
    dish: "व्यंजन",
    dishes: "व्यंजन",
    emptyTitle: "आपका कार्ट खाली है",
    emptySubtitle: "शुरू करने के लिए मेनू से व्यंजन जोड़ें।",
    browseMenu: "मेनू देखें",
    estimatedTotal: "अनुमानित कुल",
    showToWaiter: "वेटर को दिखाएँ",
    orderSummary: "ऑर्डर सारांश",
    ourOrder: "हमारा ऑर्डर",
    thankYou: "धन्यवाद 🙏",
  },
  settings: {
    title: "अनुवाद की भाषा",
    subtitle: "मेनू आपकी चुनी हुई भाषा में अनुवादित किए जाएँगे।",
  },
}

export const TRANSLATIONS: Record<TranslationLanguage, UITranslations> = {
  en,
  "zh-TW": zhTW,
  fa,
  ru,
  si,
  hi
}

export function getTranslations(lang: TranslationLanguage): UITranslations {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en
}
