'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { MessageSquareText, Send, Star, ThumbsUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { addFeedback, feedbackCategories, loadFeedback, markHelpful, removeFeedback, subscribeFeedback, type FeedbackCategory, type FeedbackEntry } from '@/lib/feedback'
import { cn } from '@/lib/utils'

function StarPicker({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating out of 5 stars">
    {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={`${star} star${star === 1 ? '' : 's'}`} onClick={() => onChange(star === value ? 0 : star)} className="p-0.5">
      <Star className={cn('size-6 transition-colors', star <= value ? 'fill-primary text-primary' : 'text-muted-foreground/40')} />
    </button>)}
  </div>
}

export function FeedbackBoard() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState<FeedbackCategory>('Decoding accuracy')
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setEntries(loadFeedback())
    return subscribeFeedback(() => setEntries(loadFeedback()))
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!message.trim()) { toast.error('Please add a short message before submitting.'); return }
    setSubmitting(true)
    const next = addFeedback({ name, category, rating, message })
    setEntries(next)
    setName(''); setCategory('Decoding accuracy'); setRating(0); setMessage('')
    setSubmitting(false)
    toast.success('Thanks — your feedback has been posted', { description: 'Visible to everyone on this website using this browser.' })
  }

  const average = entries.filter(e => e.rating > 0).length ? Math.round((entries.reduce((sum, e) => sum + e.rating, 0) / entries.filter(e => e.rating > 0).length) * 10) / 10 : 0

  return <div className="flex flex-col gap-8">
    <div>
      <p className="eyebrow">Tell us what's working</p>
      <h1 className="mt-3 font-serif text-4xl font-medium">Website feedback.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">One shared board for the whole site — decoding accuracy, bugs, ideas, anything. Every visitor using this browser sees the same feed.</p>
    </div>

    <section className="panel overflow-hidden">
      <h2 className="panel-heading"><span className="flex items-center gap-2"><MessageSquareText className="size-4 text-primary" />Share your feedback</span></h2>
      <form onSubmit={submit} className="flex flex-col gap-5 p-5">
        <FieldGroup className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="feedback-name">Name (optional)</FieldLabel>
            <input id="feedback-name" value={name} onChange={e => setName(e.target.value)} placeholder="Anonymous researcher" className="h-10 px-3 text-sm" maxLength={60} />
          </Field>
          <Field>
            <FieldLabel htmlFor="feedback-category">Category</FieldLabel>
            <select id="feedback-category" value={category} onChange={e => setCategory(e.target.value as FeedbackCategory)} className="h-10 px-3 text-sm">
              {feedbackCategories.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel>Rating (optional)</FieldLabel>
          <StarPicker value={rating} onChange={setRating} />
        </Field>
        <Field>
          <FieldLabel htmlFor="feedback-message">What happened, or what would you like to see?</FieldLabel>
          <textarea id="feedback-message" value={message} onChange={e => setMessage(e.target.value)} required maxLength={1000} placeholder="e.g. The decoded text didn't match the language I selected for my upload…" className="min-h-32 resize-y rounded-lg border border-border bg-card p-3 text-sm leading-6" />
        </Field>
        <Button type="submit" disabled={submitting} className="h-11 self-start px-5"><Send data-icon="inline-start" />Post feedback</Button>
      </form>
    </section>

    <section className="panel overflow-hidden">
      <h2 className="panel-heading"><span>Community feedback</span><span className="text-xs font-normal text-muted-foreground">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}{average > 0 && ` · ${average}★ average`}</span></h2>
      {entries.length === 0 ? <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><MessageSquareText /></EmptyMedia>
          <EmptyTitle>No feedback yet</EmptyTitle>
          <EmptyDescription>Be the first to share what's working or what needs fixing.</EmptyDescription>
        </EmptyHeader>
      </Empty> : <ul className="divide-y divide-border">
        {entries.map(entry => <li key={entry.id} className="flex flex-col gap-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{entry.name}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{entry.category}</span>
              {entry.rating > 0 && <span className="flex items-center gap-0.5">{Array.from({ length: entry.rating }).map((_, i) => <Star key={i} className="size-3.5 fill-primary text-primary" />)}</span>}
            </div>
            <span className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{entry.message}</p>
          <div className="mt-1 flex items-center gap-3">
            <button onClick={() => setEntries(markHelpful(entry.id))} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"><ThumbsUp className="size-3.5" />Helpful{entry.helpful > 0 && ` (${entry.helpful})`}</button>
            <button onClick={() => setEntries(removeFeedback(entry.id))} aria-label="Remove this feedback" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" />Remove</button>
          </div>
        </li>)}
      </ul>}
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">Feedback is stored in this browser (localStorage), so it's shared across every page of the site for anyone using this device — it isn't synced to other people's devices yet. Connect a database to make it fully cross-visitor.</p>
    </section>
  </div>
}
