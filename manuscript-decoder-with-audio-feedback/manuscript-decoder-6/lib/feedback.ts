export type FeedbackCategory = 'Decoding accuracy' | 'Bug report' | 'Suggestion' | 'Praise' | 'Other'

export type FeedbackEntry = {
  id: string
  name: string
  category: FeedbackCategory
  rating: number
  message: string
  date: string
  helpful: number
}

export const feedbackCategories: FeedbackCategory[] = ['Decoding accuracy', 'Bug report', 'Suggestion', 'Praise', 'Other']

const STORAGE_KEY = 'script-decipher-feedback-v1'
const EVENT = 'script-decipher-feedback-updated'

export function loadFeedback(): FeedbackEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(entries: FeedbackEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {
    // Storage may be unavailable in private browsing; feedback still works for this page view.
  }
}

export function addFeedback(input: { name: string; category: FeedbackCategory; rating: number; message: string }): FeedbackEntry[] {
  const entry: FeedbackEntry = {
    id: crypto.randomUUID(),
    name: input.name.trim() || 'Anonymous researcher',
    category: input.category,
    rating: input.rating,
    message: input.message.trim(),
    date: new Date().toISOString(),
    helpful: 0,
  }
  const next = [entry, ...loadFeedback()]
  persist(next)
  return next
}

export function markHelpful(id: string): FeedbackEntry[] {
  const next = loadFeedback().map(entry => entry.id === id ? { ...entry, helpful: entry.helpful + 1 } : entry)
  persist(next)
  return next
}

export function removeFeedback(id: string): FeedbackEntry[] {
  const next = loadFeedback().filter(entry => entry.id !== id)
  persist(next)
  return next
}

/** Fires when feedback changes, including from this same tab (native `storage` events only fire cross-tab). */
export function subscribeFeedback(callback: () => void) {
  const handler = () => callback()
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => { window.removeEventListener(EVENT, handler); window.removeEventListener('storage', handler) }
}
