"use client"

import { Check } from "lucide-react"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  LANGUAGE_OPTIONS,
  saveLanguagePreference,
} from "@/lib/translation-languages"
import { cn } from "@/lib/utils"
import type { TranslationLanguage } from "@/types/menu"

interface LanguageSettingsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: TranslationLanguage
  onChange: (lang: TranslationLanguage) => void
}

export function LanguageSettingsDrawer({
  open,
  onOpenChange,
  value,
  onChange,
}: LanguageSettingsDrawerProps) {
  function handleSelect(code: TranslationLanguage) {
    saveLanguagePreference(code)
    onChange(code)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle>Translation language</DrawerTitle>
          <p className="text-sm text-muted-foreground">
            Menus will be translated into your chosen language.
          </p>
        </DrawerHeader>

        <div className="space-y-2 px-4 pb-8 pt-2">
          {LANGUAGE_OPTIONS.map((lang) => {
            const isSelected = lang.code === value
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                <span className="text-2xl" aria-hidden="true">
                  {lang.flag}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{lang.nativeLabel}</p>
                  <p className="text-xs text-muted-foreground">{lang.label}</p>
                </div>
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-border bg-background",
                  )}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <Check className="size-3 text-primary-foreground" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
