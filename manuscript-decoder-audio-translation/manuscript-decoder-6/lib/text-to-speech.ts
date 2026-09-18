import { type TranslationLanguage } from './manuscripts'

const languageVoiceMap: Record<TranslationLanguage, string> = {
  English: 'en-US',
  Spanish: 'es-ES',
  French: 'fr-FR',
  German: 'de-DE',
  Portuguese: 'pt-BR',
  Arabic: 'ar-SA',
  Chinese: 'zh-CN',
  Japanese: 'ja-JP',
  Korean: 'ko-KR',
  Hindi: 'hi-IN',
  Tamil: 'ta-IN',
}

export function speak(text: string, language: TranslationLanguage, onError?: (err: string) => void) {
  if (!('speechSynthesis' in window)) {
    onError?.('Text-to-speech is not supported by this browser.')
    return
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = languageVoiceMap[language] ?? 'en-US'
  utterance.rate = 0.95

  utterance.onerror = () => {
    onError?.(`No suitable voice available for ${language}. Try a browser with this language voice installed.`)
  }

  window.speechSynthesis.speak(utterance)
}

export function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

export function isSpeaking(): boolean {
  return 'speechSynthesis' in window && window.speechSynthesis.speaking
}
