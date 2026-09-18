'use client'

import { translationLanguages, type TranslationLanguage } from '@/lib/manuscripts'

export function TranslationLanguageSelect({ value, onChange }: {
  value: TranslationLanguage
  onChange: (language: TranslationLanguage) => void
}) {
  return <label className="flex flex-wrap items-center gap-2 text-sm font-normal">
    <span className="text-muted-foreground">Output language</span>
    <select aria-label="Translation language" value={value} onChange={event => onChange(event.target.value as TranslationLanguage)} className="h-10 max-w-full bg-card px-3 text-sm text-foreground">
      {translationLanguages.map(language => <option key={language.code} value={language.name}>{language.name}</option>)}
    </select>
  </label>
}
