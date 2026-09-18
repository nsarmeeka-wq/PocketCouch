'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Cpu, FileText, Globe2, Languages, LibraryBig, Menu, Play, ScanLine, ShieldCheck, Sparkles, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { manuscripts, type Manuscript } from '@/lib/manuscripts'

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><BookOpen className="size-5" strokeWidth={1.5} /></span><span className="text-left"><span className="block font-serif text-[22px] font-semibold leading-none tracking-tight">Script<span className="text-primary"> Decipher</span></span>{!compact && <span className="mt-1.5 block text-[10px] tracking-[.22em] text-muted-foreground uppercase">Ancient wisdom. Reimagined.</span>}</span></span>
}

const steps = [
  { icon: Upload, title: 'Upload', text: 'A photograph or scan. Your journey begins with a single image.' },
  { icon: ScanLine, title: 'Enhance', text: 'Bring faded ink and delicate details back into focus.' },
  { icon: Languages, title: 'Recognize', text: 'Identify the script and uncover the words within.' },
  { icon: FileText, title: 'Transcribe', text: 'Turn handwritten history into editable Unicode text.' },
  { icon: Globe2, title: 'Translate', text: 'Make ancient knowledge accessible in your language.' },
]

export function LandingPage({ onDecode, onExplore, onSample, onAbout }: { onDecode: () => void; onExplore: () => void; onSample: (item: Manuscript) => void; onAbout: () => void }) {
  const [menu, setMenu] = useState(false)
  return <>
    <header className="relative z-20 border-b border-border">
      <div className="container-wide flex h-24 items-center justify-between">
        <a href="#" aria-label="Script Decipher home"><Brand /></a>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm text-muted-foreground lg:flex">
          <a href="#" className="text-primary">Home</a><a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a><a href="#scripts" className="transition-colors hover:text-foreground">Scripts</a><button onClick={onExplore} className="transition-colors hover:text-foreground">Explore</button><button onClick={onAbout} className="transition-colors hover:text-foreground">About</button>
        </nav>
        <div className="hidden items-center gap-5 sm:flex"><span className="text-sm text-muted-foreground">Research preview</span><Button className="h-10 px-5" onClick={onDecode}>Get started <ArrowUpRight data-icon="inline-end" /></Button></div>
        <Button variant="ghost" size="icon" aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu(!menu)} className="lg:hidden">{menu ? <X /> : <Menu />}</Button>
      </div>
      {menu && <nav aria-label="Mobile navigation" className="flex flex-col gap-5 border-t border-border bg-card p-6 lg:hidden"><a href="#how-it-works" onClick={() => setMenu(false)}>How it works</a><a href="#scripts" onClick={() => setMenu(false)}>Supported scripts</a><button className="text-left" onClick={onExplore}>Explore archives</button><button className="text-left" onClick={onAbout}>About the project</button><Button onClick={onDecode}>Get started <ArrowRight /></Button></nav>}
    </header>
    <main id="main-content">
      <section className="container-wide grid items-center gap-12 py-16 lg:min-h-[624px] lg:grid-cols-[1fr_1.05fr] lg:gap-8 lg:py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }} className="flex flex-col items-start gap-7">
          <div className="flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-2 text-[11px] font-medium tracking-[.12em] text-primary uppercase"><Sparkles className="size-3.5" /> Where heritage meets intelligence</div>
          <h1 className="hero-title text-balance">Decode the<br />wisdom of <span className="text-primary italic">the past.</span></h1>
          <p className="max-w-[470px] text-base leading-[1.8] text-muted-foreground">Centuries of knowledge. Hidden in handwritten pages.<br className="hidden xl:block" /> Bring ancient Indian manuscripts to life with AI-powered transcription, translation, and discovery.</p>
          <div className="flex flex-wrap items-center gap-3"><Button onClick={onDecode} className="h-12 gap-3 px-5"><ScanLine data-icon="inline-start" />Decode a manuscript<ArrowRight data-icon="inline-end" /></Button><Button variant="outline" onClick={onExplore} className="h-12 gap-2 px-5"><LibraryBig data-icon="inline-start" />Explore archives</Button></div>
          <div className="flex flex-wrap items-center gap-5 pt-1 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" />Your history, handled with care</span><span className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-primary" />3 Indian scripts supported</span></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .85, delay: .2 }} className="manuscript-stage mx-auto flex h-[450px] w-full max-w-[610px] items-center justify-center">
          <div className="absolute top-8 left-7 flex items-center gap-2.5 rounded-lg border border-primary/25 bg-card px-3 py-2.5 text-[11px] text-primary"><span className="size-1.5 rounded-full bg-primary" />THE PAST, NOW WITH A FUTURE</div>
          <div className="relative h-[300px] w-[90%] -rotate-[7deg] overflow-hidden rounded-lg border border-primary/25 shadow-2xl shadow-background">
            <img src="/images/sanskrit-manuscript.png" alt="Aged Sanskrit manuscript with handwritten Devanagari script on golden parchment" className="size-full object-cover" fetchPriority="high" />
            <div className="scan-line" />
            <span className="absolute bottom-3 left-4 rounded bg-background/75 px-2 py-1 text-[10px] tracking-widest text-primary">SANSKRIT · DEVANAGARI</span>
          </div>
          <div className="glass-panel absolute top-28 right-0 flex items-center gap-3 rounded-xl px-4 py-3"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><ScanLine className="size-4" /></span><span><span className="block text-[11px] text-muted-foreground">Script identified</span><span className="block text-sm font-medium">Devanagari <Check className="ml-1 inline size-3 text-primary" /></span></span></div>
          <div className="glass-panel absolute right-2 bottom-2 w-[80%] rounded-xl p-5 sm:right-1 sm:w-[75%]">
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] font-medium tracking-widest text-primary"><Sparkles className="size-3.5" /> WISDOM, REDISCOVERED</span><span className="text-[10px] text-muted-foreground">ILLUSTRATIVE PREVIEW</span></div>
            <p lang="sa" className="mt-4 text-xl leading-relaxed text-foreground/90">सर्वे भवन्तु सुखिनः। सर्वे सन्तु निरामयाः।</p>
            <div className="my-3 h-px bg-border" />
            <p className="font-serif text-xl italic text-foreground/85">“May all be happy. May all be free from illness.”</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Languages className="size-3" />Sanskrit <ArrowRight className="mx-1 size-3" /> English</div>
          </div>
          <button onClick={() => onSample(manuscripts[0])} className="absolute -bottom-9 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-xs text-muted-foreground transition-colors hover:text-primary"><Play className="size-3 fill-current" />See the transformation<ArrowUpRight className="size-3" /></button>
        </motion.div>
      </section>
      <div className="container-wide mt-8 border-y border-border">
        <div className="grid grid-cols-2 gap-y-8 py-9 md:grid-cols-4">
          {[{ icon: BookOpen, value: '10M+', label: 'Manuscripts. Countless stories.' }, { icon: Languages, value: '3 scripts', label: 'One shared cultural legacy.' }, { icon: Globe2, value: 'Beyond language', label: 'Translate. Understand. Connect.' }, { icon: Cpu, value: 'Powered by AI', label: 'Built for human discovery.' }].map(({ icon: Icon, value, label }, i) => <div key={value} className={`flex items-center gap-4 ${i ? 'md:border-l md:border-border md:pl-8' : ''}`}><Icon className="hidden size-7 shrink-0 text-primary/80 sm:block" strokeWidth={1.3} /><div><p className="font-serif text-[25px] font-medium leading-tight">{value}</p><p className="mt-1.5 text-[11px] text-muted-foreground">{label}</p></div></div>)}
        </div>
      </div>
      <section id="how-it-works" className="container-wide py-20">
        <div className="flex flex-col items-center gap-3 text-center"><p className="eyebrow">From ink to insight</p><h2 className="section-title">An ancient page. <span className="text-primary italic">A new beginning.</span></h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Five thoughtful steps to make the past part of our future.</p></div>
        <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(({ icon: Icon, title, text }, i) => <motion.div key={title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .07 }} className="relative flex flex-col items-center gap-4 text-center"><span className="flex size-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary"><Icon className="size-6" strokeWidth={1.5} /></span>{i < 4 && <ChevronRight className="absolute top-5 -right-5 hidden size-4 text-primary/40 lg:block" />}<h3 className="text-sm font-medium"><span className="mr-2 text-primary/65">0{i + 1}</span>{title}</h3><p className="max-w-48 text-[13px] leading-[1.7] text-muted-foreground">{text}</p></motion.div>)}
        </div>
      </section>
      <section id="scripts" className="border-y border-border bg-card/35 py-16">
        <div className="container-wide grid items-center gap-10 lg:grid-cols-[.9fr_2fr]">
          <div className="flex flex-col items-start gap-4"><p className="eyebrow">Many scripts. One heritage.</p><h2 className="section-title">Every script has<br />a story to tell.</h2><p className="max-w-72 text-sm leading-7 text-muted-foreground">Built to honor the beauty and complexity of India&apos;s written traditions.</p><button onClick={onDecode} className="flex items-center gap-2 text-sm text-primary">Find your manuscript&apos;s voice<ArrowRight className="size-4" /></button></div>
          <div className="grid gap-4 sm:grid-cols-3">{[{ character: 'अ', name: 'Devanagari', note: 'Sanskrit & Hindi', sample: manuscripts[0] }, { character: 'அ', name: 'Tamil', note: 'Ancient & modern Tamil', sample: manuscripts[1] }, { character: 'অ', name: 'Bengali', note: 'Bengali literature', sample: manuscripts[2] }].map(item => <button key={item.name} onClick={() => onSample(item.sample)} className="script-card group flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6 text-left transition-colors hover:border-primary/40"><span className="text-6xl leading-[1.4] text-primary">{item.character}</span><div className="flex w-full items-center justify-between"><h3 className="font-serif text-2xl font-semibold">{item.name}</h3><ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" /></div><p className="text-xs text-muted-foreground">{item.note}</p><span className="flex items-center gap-1.5 text-[10px] tracking-widest text-primary/80 uppercase"><span className="size-1 rounded-full bg-primary" />Explore sample</span></button>)}</div>
        </div>
      </section>
      <section id="archives" className="container-wide py-20">
        <div className="flex flex-wrap items-end justify-between gap-5"><div className="flex flex-col gap-3"><p className="eyebrow">Stories waiting to be discovered</p><h2 className="section-title">A window into <span className="text-primary italic">our heritage.</span></h2></div><Button onClick={onExplore} variant="outline" className="h-10 px-4">Explore the archive<ArrowUpRight data-icon="inline-end" /></Button></div>
        <div className="mt-9 grid gap-6 md:grid-cols-3">{manuscripts.map(item => <button key={item.id} onClick={() => onSample(item)} className="archive-card group overflow-hidden rounded-xl border border-border bg-card text-left"><div className="relative h-52 overflow-hidden"><img src={item.image} alt={`${item.script} manuscript on aged paper`} loading="lazy" className="archival-image size-full object-cover" /><span className="absolute top-4 left-4"><Badge variant="secondary">{item.script}</Badge></span></div><div className="flex flex-col gap-3 p-5"><span className="text-[10px] tracking-widest text-primary uppercase">{item.subject} · {item.period}</span><div className="flex items-center justify-between"><h3 className="font-serif text-2xl font-medium">{item.title}</h3><ArrowUpRight className="size-4 text-primary" /></div><p className="text-xs text-muted-foreground">Illustrative collection · {item.language}</p></div></button>)}</div>
        <p className="mt-5 text-xs text-muted-foreground">Curated demo texts and AI-generated manuscript imagery. Not authenticated historical artifacts.</p>
      </section>
      <section className="container-wide pb-20"><div className="flex flex-col items-center gap-5 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-14 text-center"><BookOpen className="size-7 text-primary" strokeWidth={1.3} /><h2 className="section-title text-balance">The next chapter of history <span className="text-primary italic">starts with you.</span></h2><p className="max-w-lg text-sm leading-7 text-muted-foreground">For the researcher, the storyteller, the endlessly curious.<br />Help yesterday&apos;s wisdom find tomorrow&apos;s readers.</p><Button onClick={onDecode} className="h-12 px-6">Decode your first manuscript<ArrowRight data-icon="inline-end" /></Button><p className="text-xs text-muted-foreground">No account needed for the demo.</p></div></section>
    </main>
    <footer className="border-t border-border"><div className="container-wide flex flex-col items-center justify-between gap-6 py-8 md:flex-row"><Brand compact /><p className="text-xs text-muted-foreground">Preserving ancient wisdom through artificial intelligence.</p><button onClick={onAbout} className="text-xs text-muted-foreground hover:text-primary">About this project<ArrowUpRight className="ml-1 inline size-3" /></button></div><div className="container-wide flex flex-wrap justify-between gap-3 border-t border-border py-5 text-[11px] text-muted-foreground"><span>© 2026 Script Decipher. A bridge across centuries.</span><span>Made for discovery. Designed with respect.</span></div></footer>
  </>
}
