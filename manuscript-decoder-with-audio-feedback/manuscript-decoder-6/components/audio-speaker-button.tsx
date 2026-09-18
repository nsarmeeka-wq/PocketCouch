'use client'

import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { speak, stopSpeech, isSpeaking } from '@/lib/text-to-speech'
import { type TranslationLanguage } from '@/lib/manuscripts'
import { cn } from '@/lib/utils'

export function AudioSpeakerButton({ text, language, disabled = false, className = '' }: { text: string; language: TranslationLanguage; disabled?: boolean; className?: string }) {
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const checkInterval = setInterval(() => {
      setIsPlaying(isSpeaking())
    }, 100)
    return () => clearInterval(checkInterval)
  }, [])

  function toggleAudio() {
    if (!text.trim()) {
      toast.info('No text to read', { description: `Add text in ${language} first.` })
      return
    }

    if (isPlaying) {
      stopSpeech()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      speak(text, language, (error) => {
        setIsPlaying(false)
        toast.error(error)
      })
    }
  }

  return <Button variant="ghost" size="icon" disabled={disabled} onClick={toggleAudio} className={cn('relative', className)} aria-label={isPlaying ? `Stop reading ${language}` : `Read in ${language}`} title={isPlaying ? `Stop reading ${language}` : `Read translation in ${language}`}>
    {isPlaying ? <VolumeX className="size-4 animate-pulse text-primary" /> : <Volume2 className="size-4" />}
  </Button>
}
