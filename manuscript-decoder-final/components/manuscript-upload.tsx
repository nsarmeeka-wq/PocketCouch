'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Crop, FileImage, RotateCcw, RotateCw, Sparkles, UploadCloud, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { manuscripts, type Manuscript } from '@/lib/manuscripts'
import { cn } from '@/lib/utils'

export function UploadZone({ onUpload, onSample }: { onUpload: (image: string, name: string) => void; onSample: (item: Manuscript) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function acceptFile(file?: File) {
    if (!file) return
    setError('')
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setError('Please choose a JPG or PNG image. Other file types are not supported.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('This image is larger than 10 MB. Please resize it and try again.'); return }
    setLoading(true)
    try {
      const bitmap = await createImageBitmap(file)
      if (bitmap.width * bitmap.height > 24_000_000) { bitmap.close(); throw new Error('Please use an image under 24 megapixels for a responsive preview.') }
      bitmap.close()
      const reader = new FileReader()
      reader.onload = () => { setLoading(false); onUpload(reader.result as string, file.name.replace(/\.[^.]+$/, '')) }
      reader.onerror = () => { setLoading(false); setError('We could not read this file. Please try another image.') }
      reader.readAsDataURL(file)
    } catch (err) { setLoading(false); setError(err instanceof Error && err.message.includes('megapixels') ? err.message : 'This file could not be decoded as an image. Please try a clear JPG or PNG.') }
  }
  return <div className="flex flex-col gap-7">
    <div className={cn('flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-12 text-center transition-colors', dragging ? 'border-primary bg-primary/10' : 'border-primary/30 bg-card')} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void acceptFile(e.dataTransfer.files[0]) }}>
      <span className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><UploadCloud className="size-7" strokeWidth={1.3} /></span>
      <h2 className="font-serif text-3xl font-medium">Every page holds a possibility.</h2>
      <p className="mt-3 text-sm text-muted-foreground">Drag your manuscript here, or choose an image to begin.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Button disabled={loading} onClick={() => input.current?.click()} className="h-11 px-5"><FileImage data-icon="inline-start" />{loading ? 'Reading image…' : 'Browse files'}</Button><Button variant="outline" className="h-11 px-5" onClick={() => camera.current?.click()}><Camera data-icon="inline-start" />Use camera</Button></div>
      <input ref={input} type="file" accept="image/jpeg,image/png" className="sr-only" aria-label="Upload manuscript image" onChange={e => { void acceptFile(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={camera} type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" aria-label="Capture manuscript photo" onChange={e => { void acceptFile(e.target.files?.[0]); e.target.value = '' }} />
      <p className="mt-5 text-xs text-muted-foreground">JPG or PNG · Up to 10 MB · Files stay in this browser tab</p>
    </div>
    {error && <Alert variant="destructive"><FileImage /><AlertTitle>Let&apos;s try a different image</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <p className="text-center text-xs text-muted-foreground"><Sparkles className="mr-1.5 inline size-3.5 text-primary" />For the best results, use a well-lit photograph with the whole page in focus.</p>
    <div className="flex items-center gap-4"><div className="h-px flex-1 bg-border" /><p className="text-xs text-muted-foreground">Or explore a sample manuscript</p><div className="h-px flex-1 bg-border" /></div>
    <div className="grid gap-4 sm:grid-cols-3">{manuscripts.map(item => <button key={item.id} onClick={() => onSample(item)} className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 text-left hover:border-primary/40"><img src={item.image} alt={`${item.script} demo manuscript`} className="size-16 rounded-lg object-cover" /><span><span className="block text-sm font-medium">{item.script}</span><span className="mt-1 block text-xs text-muted-foreground">{item.subject} · Demo</span></span></button>)}</div>
  </div>
}

export function ImageViewer({ image, scanning = false }: { image: string; scanning?: boolean }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [cropped, setCropped] = useState(false)
  const [preview, setPreview] = useState(image)
  const [cropError, setCropError] = useState('')
  const imageRef = useRef<HTMLImageElement>(null)
  useEffect(() => { setPreview(image); setCropped(false); setZoom(1); setRotation(0); setBrightness(100); setContrast(100) }, [image])
  function crop() {
    if (cropped) { setPreview(image); setCropped(false); return }
    const img = imageRef.current
    if (!img?.complete || !img.naturalWidth) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * .8)
      canvas.height = Math.round(img.naturalHeight * .8)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')
      ctx.drawImage(img, img.naturalWidth * .1, img.naturalHeight * .1, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
      setPreview(canvas.toDataURL('image/png')); setCropped(true); setCropError('')
    } catch { setCropError('The image could not be cropped in this browser.') }
  }
  return <section className="panel min-w-0 overflow-hidden">
    <h2 className="panel-heading"><span>Original manuscript</span><span className="text-xs font-normal text-muted-foreground">Image preview</span></h2>
    <div className="relative flex h-72 items-center justify-center overflow-hidden bg-background sm:h-80"><img ref={imageRef} src={preview} alt="Uploaded manuscript with current preview adjustments" crossOrigin="anonymous" className="size-full object-contain transition-transform" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, filter: `brightness(${brightness}%) contrast(${contrast}%)` }} />{scanning && <div className="scan-line" />}</div>
    <div className="no-print flex flex-wrap items-center justify-center gap-2 border-y border-border p-3">
      <Button variant="ghost" size="icon" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(Math.min(3, zoom + .25))}><ZoomIn /></Button><span className="w-10 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span><Button variant="ghost" size="icon" aria-label="Zoom out" disabled={zoom <= .5} onClick={() => setZoom(Math.max(.5, zoom - .25))}><ZoomOut /></Button><Button variant="ghost" size="icon" aria-label="Rotate image clockwise" onClick={() => setRotation(rotation + 90)}><RotateCw /></Button><Button variant="ghost" size="icon" aria-label={cropped ? 'Undo crop' : 'Crop ten percent from edges'} onClick={crop}>{cropped ? <RotateCcw /> : <Crop />}</Button><Button variant="outline" onClick={() => { setBrightness(115); setContrast(125) }}><Sparkles />Enhance</Button>
    </div>
    <div className="no-print p-5"><FieldGroup>{[{ name: 'Brightness', value: brightness, set: setBrightness }, { name: 'Contrast', value: contrast, set: setContrast }].map(control => <Field key={control.name}><FieldLabel>{control.name} <span className="ml-auto text-xs text-muted-foreground">{control.value}%</span></FieldLabel><Slider aria-label={control.name} value={[control.value]} min={50} max={180} onValueChange={v => control.set(Array.isArray(v) ? v[0] : v)} /></Field>)}</FieldGroup><p className="mt-4 text-xs text-muted-foreground">Adjustments affect the preview, not the simulated OCR.</p>{cropError && <p role="alert" className="mt-2 text-sm text-primary">{cropError}</p>}</div>
  </section>
}
