import type { TranslationLanguage } from "@/types/menu"

export interface LanguageOption {
  code: TranslationLanguage
  label: string
  nativeLabel: string
  flag: string
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    flag: "🇬🇧",
  },
  {
    code: "zh-TW",
    label: "Traditional Chinese",
    nativeLabel: "繁體中文",
    flag: "🇭🇰",
  },
]

export const DEFAULT_LANGUAGE: TranslationLanguage = "zh-TW"

const STORAGE_KEY = "menu-translator:lang"

export function loadLanguagePreference(): TranslationLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "en" || stored === "zh-TW") return stored
  } catch {
    // localStorage unavailable (private browsing, SSR, etc.)
  }
  return DEFAULT_LANGUAGE
}

export function saveLanguagePreference(lang: TranslationLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // ignore
  }
}

export function getLanguageOption(code: TranslationLanguage): LanguageOption {
  return LANGUAGE_OPTIONS.find((l) => l.code === code) ?? LANGUAGE_OPTIONS[0]
}
