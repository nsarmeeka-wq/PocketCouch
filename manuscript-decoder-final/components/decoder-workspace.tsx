'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Copy, Download, FileJson, FileText, Globe2, Info, Languages, Layers3, Loader2, Save, ScanLine, Search, Sparkles, Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ImageViewer, UploadZone } from '@/components/manuscript-upload'
import { downloadFile, manuscripts, translationLocale, type Manuscript, type Script, type TranslationLanguage } from '@/lib/manuscripts'
import { TranslationLanguageSelect } from '@/components/translation-language-select'
import { cn } from '@/lib/utils'

const stages = ['Enhancing manuscript image', 'Locating handwritten text', 'Identifying the script', 'Transcribing to Unicode', 'Translating and extracting insights']
const knowledge: Record<string, string> = {
  Ayurveda: 'A traditional South Asian system of medicine with a long Sanskrit textual history. Related topics include herbs, diet, and health. This is a demo collection label, not a classification of your uploaded image.',
  Philosophy: 'The study of knowledge, ethics, existence, and the nature of reality. Indian philosophical writings span diverse languages and traditions. This label describes the sample collection.',
  Literature: 'Poetry, prose, and oral traditions preserved through writing. Historical context requires a verified source and expert review. This label describes the sample collection.',
  Wellbeing: 'The example Sanskrit verse expresses a wish for universal happiness and freedom from illness. A cultural reading, not medical advice.',
  Wisdom: 'Knowledge and ethical insight passed between generations through written and oral traditions.',
  Heritage: 'The languages, artifacts, practices, and knowledge inherited from earlier generations.',
}

export function DecoderWorkspace({ initial, initialComplete = false, onSave }: { initial?: Manuscript; initialComplete?: boolean; onSave: (item: Manuscript) => void }) {
  const [item, setItem] = useState<Manuscript | undefined>(initial)
  const [phase, setPhase] = useState<'upload' | 'ready' | 'processing' | 'complete'>(initial ? (initialComplete ? 'complete' : 'ready') : 'upload')
  const [progress, setProgress] = useState(0)
  const [uploaded, setUploaded] = useState(false)
  const [language, setLanguage] = useState<TranslationLanguage>(initial?.preferredTranslation ?? 'English')
  const locale = translationLocale(language)
  const [keyword, setKeyword] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const transcription = useRef<HTMLTextAreaElement>(null)
  const complete = phase === 'complete'
  const running = phase === 'processing'

  useEffect(() => {
    if (phase !== 'processing') return
    const timer = setInterval(() => setProgress(value => Math.min(100, value + 4)), 180)
    return () => clearInterval(timer)
  }, [phase])
  useEffect(() => {
    if (phase === 'processing' && progress === 100) { setPhase('complete'); toast.success('Demo transformation complete', { description: 'These are illustrative results, not OCR of your image.' }) }
  }, [phase, progress])
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }, [])

  function chooseSample(sample: Manuscript) { setItem({ ...sample, translations: { ...sample.translations } }); setUploaded(false); setPhase('ready'); setProgress(0) }
  function update(field: keyof Manuscript, value: string) { if (item) setItem({ ...item, [field]: value }) }
  function searchText() {
    if (!item || !query.trim()) return
    const index = item.text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase())
    if (index === -1) { toast.info('No matching text found'); return }
    transcription.current?.focus(); transcription.current?.setSelectionRange(index, index + query.length)
  }
  async function copy() { try { await navigator.clipboard.writeText(item?.text || ''); toast.success('Transcription copied') } catch { toast.error('Clipboard unavailable. Select the text and copy it manually.') } }
  function listen() {
    if (!('speechSynthesis' in window) || !item) { toast.error('Text-to-speech is not supported by this browser.'); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(item.text)
    const speechLocales: Partial<Record<Script, string>> = { Tamil: 'ta-IN', Bengali: 'bn-IN', Kannada: 'kn-IN', Telugu: 'te-IN', Odia: 'or-IN', 'Perso-Arabic': 'fa-IR' }
    utterance.lang = speechLocales[item.script] ?? 'hi-IN'
    utterance.onerror = () => toast.error('No suitable voice is available. Try a browser with an Indic language voice installed.')
    window.speechSynthesis.speak(utterance)
    toast.info('Reading transcription', { description: 'Pronunciation depends on your browser’s installed voices.' })
  }
  function exportMetadata(format: 'json' | 'csv') {
    if (!item) return
    const metadata = { title: item.title, script: item.script, language: item.language, subject: item.subject, period: item.period, location: item.location, sampleConfidence: item.confidence, date: item.date, demo: true }
    if (format === 'json') downloadFile(JSON.stringify(metadata, null, 2), 'manuscript-metadata.json', 'application/json')
    else {
      const escape = (v: unknown) => { const str = String(v); return `"${(/^[=+@\-\t\r]/.test(str) ? "'" + str : str).replaceAll('"', '""')}"` }
      downloadFile(Object.keys(metadata).join(',') + '\n' + Object.values(metadata).map(escape).join(','), 'manuscript-metadata.csv', 'text/csv;charset=utf-8')
    }
  }

  return <div className="flex flex-col gap-7">
    <div className="no-print flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">The discovery workspace</p><h1 className="mt-3 font-serif text-4xl font-medium">{phase === 'upload' ? 'Unlock a page of history.' : complete ? 'Ancient words. New possibilities.' : 'A little closer to the past.'}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Upload, explore, and bring your manuscript into the digital world.</p></div><Badge variant="outline"><Sparkles data-icon="inline-start" />Interactive demo</Badge></div>
    <Alert className="no-print"><Info /><AlertDescription>Research prototype: OCR, script detection, confidence scores, and translations are simulated using fixed sample texts. No AI models or archive backend are connected.</AlertDescription></Alert>
    {phase === 'upload' ? <UploadZone onSample={chooseSample} onUpload={(image, name) => { setItem({ ...manuscripts[0], id: crypto.randomUUID(), title: name, image, translations: { ...manuscripts[0].translations }, date: new Date().toISOString().slice(0, 10) }); setUploaded(true); setPhase('ready') }} /> : item && <>
      <div className="no-print flex flex-wrap items-center justify-between gap-4"><Button variant="ghost" onClick={() => { setPhase('upload'); setItem(undefined); setProgress(0) }}><ArrowLeft data-icon="inline-start" />{running ? 'Cancel and start again' : 'New manuscript'}</Button><div className="flex flex-wrap items-center gap-3">{!complete && <><label htmlFor="demo-script" className="text-xs text-muted-foreground">Demo language</label><select id="demo-script" className="h-10 px-3 text-sm" value={item.language} disabled={running} onChange={e => { const sample = manuscripts.find(m => m.language === e.target.value)!; setItem({ ...sample, ...(uploaded ? { id: item.id, title: item.title, image: item.image } : {}), translations: { ...sample.translations } }) }}>{manuscripts.map(sample => <option key={sample.language} value={sample.language}>{sample.language} · {sample.script}</option>)}</select></>}{phase === 'ready' && <Button onClick={() => { setProgress(0); setPhase('processing') }} className="h-10 px-5"><Sparkles data-icon="inline-start" />Run demo decoder<ArrowRight data-icon="inline-end" /></Button>}{complete && <Button className="h-10 px-4" onClick={() => onSave({ ...item, preferredTranslation: language })}><Save data-icon="inline-start" />Save to session collection</Button>}</div></div>
      <Tabs defaultValue="results">
        {complete && <TabsList className="no-print mb-4"><TabsTrigger value="results"><FileText />Results</TabsTrigger><TabsTrigger value="compare"><Layers3 />Compare versions</TabsTrigger></TabsList>}
        <TabsContent value="results">
          <div className="grid items-start gap-5 xl:grid-cols-[1fr_.78fr_1fr]">
            <ImageViewer image={item.image} scanning={running} />
            <section className="panel overflow-hidden"><h2 className="panel-heading"><span className="flex items-center gap-2"><Sparkles className="size-4 text-primary" />Decoding journey</span></h2><div className="flex flex-col gap-6 p-5"><div className="flex flex-col items-center gap-3 py-3"><span className={cn('flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary', running && 'animate-pulse')}>{complete ? <CheckCircle2 className="size-7" strokeWidth={1.5} /> : <ScanLine className="size-7" strokeWidth={1.5} />}</span><p className="text-center font-serif text-2xl">{complete ? 'A new chapter, unlocked.' : running ? 'Awakening ancient knowledge…' : 'Ready for discovery.'}</p><p className="text-center text-xs leading-5 text-muted-foreground">{complete ? 'Your illustrative results are ready to explore.' : 'A guided preview of the digitization process.'}</p></div>
              <ol className="flex flex-col gap-5">{stages.map((step, i) => { const done = complete || progress >= (i + 1) * 20; const active = running && Math.floor(progress / 20) === i; return <li key={step} className={cn('flex items-center gap-3 text-xs', done || active ? 'text-foreground' : 'text-muted-foreground')}><span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border', done ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border')}>{done ? <Check className="size-3" /> : active ? <Loader2 className="size-3 animate-spin" /> : i + 1}</span>{step}</li> })}</ol>
              <div aria-live="polite"><div className="mb-3 flex justify-between text-xs text-muted-foreground"><span>{complete ? 'Demo complete' : 'Demo progress'}</span><span>{complete ? 100 : progress}%</span></div><Progress aria-label="Demo decoding progress" value={complete ? 100 : progress} /></div>
              {complete && <div className="rounded-lg border border-primary/20 bg-primary/5 p-4"><p className="text-xs text-muted-foreground">Example detected script</p><p className="mt-2 flex items-center justify-between text-sm"><span>{item.script}</span><CheckCircle2 className="size-4 text-primary" /></p><p className="mt-2 text-xs text-primary">96.8% sample confidence</p></div>}
            </div></section>
            <section className="panel flex min-h-[570px] flex-col overflow-hidden"><h2 className="panel-heading"><span>Digital transcription</span><Languages className="size-4 text-primary" /></h2>{complete ? <><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3"><Badge variant="secondary">{item.script}</Badge><div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="Copy transcription" onClick={copy}><Copy /></Button><Button variant="ghost" size="icon" aria-label="Listen to transcription" onClick={listen}><Volume2 /></Button></div></div><textarea ref={transcription} aria-label="Editable Unicode transcription" value={item.text} onChange={e => update('text', e.target.value)} className="min-h-64 flex-1 resize-y rounded-none border-0 bg-card p-5 text-lg leading-[2]" /><div className="no-print flex items-center gap-2 border-t border-border p-3"><input aria-label="Search transcription" placeholder="Find in transcription…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) searchText() }} className="h-9 min-w-0 flex-1 px-3 text-xs" /><Button variant="ghost" size="icon" aria-label="Find text" onClick={searchText}><Search /></Button></div><p className="border-t border-border px-5 py-4 text-xs text-muted-foreground">Sample OCR confidence <span className="float-none ml-2 text-primary">{item.confidence}%</span> · Editable Unicode</p></> : <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"><FileText className="size-9 text-primary/40" strokeWidth={1} /><p className="font-serif text-2xl">Words waiting to be found.</p><p className="text-xs leading-6 text-muted-foreground">{running ? 'Your sample transcription will appear when the demo completes.' : 'Run the demo decoder to see an example Unicode transcription.'}</p></div>}</section>
          </div>
          {complete && <div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="panel overflow-hidden"><div className="panel-heading flex-wrap gap-3"><h2 className="flex items-center gap-2"><Globe2 className="size-4 text-primary" />Modern translation</h2><TranslationLanguageSelect value={language} onChange={setLanguage} /></div><textarea aria-label="Editable translation" lang={locale.code} dir={locale.direction} value={item.translations[language]} onChange={e => setItem({ ...item, translations: { ...item.translations, [language]: e.target.value } })} className="h-40 w-full resize-y rounded-none border-0 bg-card p-5 text-base leading-8" /><div className="flex flex-col gap-3 border-t border-border p-5"><p className="text-sm leading-6 text-muted-foreground">Fixed sample translation · Edits to the original do not retranslate automatically.</p><Button variant="outline" className="no-print self-start" onClick={() => downloadFile(item.translations[language], `script-decipher-${item.script.toLowerCase()}-${locale.code}-translation.txt`)}><Download data-icon="inline-start" />Download {language} translation</Button></div></section><section className="panel overflow-hidden"><h2 className="panel-heading"><span className="flex items-center gap-2"><BookOpen className="size-4 text-primary" />Knowledge within the words</span></h2><div className="flex flex-col gap-5 p-5"><p className="text-sm leading-7 text-muted-foreground">Explore the themes of this sample collection. Select a topic to discover its meaning and context.</p><div className="flex flex-wrap gap-2">{[item.subject, ...(item.script === 'Devanagari' ? ['Wellbeing'] : ['Wisdom']), 'Heritage'].map(word => <Button key={word} variant="outline" onClick={() => setKeyword(word)}>{word}<ArrowRight data-icon="inline-end" /></Button>)}</div><p className="text-xs text-muted-foreground">Illustrative subject: <span className="text-primary">{item.subject}</span> · Not an analysis of your uploaded image.</p></div></section></div>}
        </TabsContent>
        <TabsContent value="compare"><div className="grid gap-5 lg:grid-cols-3"><ImageViewer image={item.image} /><section className="panel"><h2 className="panel-heading">Unicode transcription</h2><p className="whitespace-pre-wrap p-6 text-xl leading-[2]">{item.text}</p></section><section className="panel"><div className="panel-heading flex-wrap gap-3"><h2>Translation</h2><TranslationLanguageSelect value={language} onChange={setLanguage} /></div><p lang={locale.code} dir={locale.direction} className="whitespace-pre-wrap p-6 text-lg leading-9">{item.translations[language]}</p></section></div></TabsContent>
      </Tabs>
      {complete && <>
        <section className="panel overflow-hidden"><h2 className="panel-heading"><span>Manuscript metadata</span><Badge variant="outline">Demo · Editable</Badge></h2><div className="p-5"><FieldGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[{ label: 'Title', key: 'title' }, { label: 'Language', key: 'language' }, { label: 'Subject', key: 'subject' }, { label: 'Illustrative period', key: 'period' }, { label: 'Illustrative location', key: 'location' }].map(({ label, key }) => <Field key={key}><FieldLabel htmlFor={`meta-${key}`}>{label}</FieldLabel><input id={`meta-${key}`} className="h-10 px-3 text-sm" value={item[key as keyof Manuscript] as string} onChange={e => update(key as keyof Manuscript, e.target.value)} /></Field>)}<Field><FieldLabel htmlFor="meta-script">Script</FieldLabel><select id="meta-script" className="h-10 px-3 text-sm" value={item.script} onChange={e => update('script', e.target.value as Script)}>{['Devanagari', 'Tamil', 'Bengali', 'Kannada', 'Telugu', 'Odia', 'Perso-Arabic'].map(script => <option key={script}>{script}</option>)}</select></Field></FieldGroup></div><p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">Dates, origin, and subject are illustrative. Reliable historical attribution requires specialist verification.</p></section>
        <section className="no-print"><div className="mb-5"><p className="eyebrow">Keep the knowledge alive</p><h2 className="mt-3 font-serif text-3xl">Preserve & export</h2></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{ icon: FileText, title: 'Unicode text', note: 'Editable, portable .txt', action: () => downloadFile(item.text, 'manuscript-transcription.txt'), cta: 'Download TXT' }, { icon: FileText, title: 'Research document', note: 'Use “Save as PDF” in print', action: () => window.print(), cta: 'Print / save PDF' }, { icon: FileJson, title: 'Structured metadata', note: 'For catalogs and research', action: () => exportMetadata('json'), cta: 'Download JSON' }, { icon: Download, title: 'Spreadsheet metadata', note: 'A portable .csv record', action: () => exportMetadata('csv'), cta: 'Download CSV' }].map(({ icon: Icon, title, note, action, cta }) => <div key={title} className="panel flex flex-col items-start gap-3 p-5"><Icon className="size-6 text-primary" strokeWidth={1.4} /><h3 className="text-sm font-medium">{title}</h3><p className="text-xs text-muted-foreground">{note}</p><Button variant="outline" onClick={action} className="mt-1 w-full">{cta}<Download data-icon="inline-end" /></Button></div>)}</div></section>
      </>}
    </>}
    <Dialog open={Boolean(keyword)} onOpenChange={open => { if (!open) setKeyword(null) }}><DialogContent><DialogHeader><DialogTitle>{keyword}</DialogTitle><DialogDescription>{keyword && (knowledge[keyword] || 'A custom subject label added to your manuscript metadata. Specialist review can help establish its historical context.')}</DialogDescription></DialogHeader></DialogContent></Dialog>
  </div>
}
