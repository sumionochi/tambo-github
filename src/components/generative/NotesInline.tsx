// components/generative/NotesInline.tsx
// Renders saved notes inline in the chat thread
'use client'

import { z } from 'zod'
import type { TamboComponent } from '@tambo-ai/react'
import { useEffect, useState } from 'react'
import { StickyNote, Search, Link2, ArrowRight } from 'lucide-react'

// ─── Schema ───
export const NotesInlinePropsSchema = z.object({
  maxNotes: z.number().nullable().default(5).describe("Max notes to show"),
  filterContent: z.string().nullable().default('').describe("Optional content filter substring"),
})

const _parse = NotesInlinePropsSchema.parse.bind(NotesInlinePropsSchema)
const _safeParse = NotesInlinePropsSchema.safeParse.bind(NotesInlinePropsSchema)
;(NotesInlinePropsSchema as any).parse = (d: unknown, p?: any) => _parse(d ?? {}, p)
;(NotesInlinePropsSchema as any).safeParse = (d: unknown, p?: any) => _safeParse(d ?? {}, p)

type Props = z.infer<typeof NotesInlinePropsSchema>

interface Note {
  id: string
  content: string
  sourceSearch?: string
  linkedCollection?: string
  createdAt: string
}

function NotesInline({ maxNotes, filterContent }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes')
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes || [])
      }
    } catch (e) {
      console.error('NotesInline fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  // Filter
  let filtered = [...notes]
  if (filterContent) {
    const q = (filterContent || '').toLowerCase()
    filtered = filtered.filter(n => (n.content || '').toLowerCase().includes(q))
  }
  const display = filtered.slice(0, maxNotes || 5)
  const remaining = filtered.length - display.length

  // Loading
  if (loading) {
    return (
      <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-100)' }}>
            <StickyNote size={16} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <div className="h-4 w-24 rounded-lg animate-pulse" style={{ background: 'var(--fs-cream-300)' }} />
        </div>
        {[1, 2].map(i => (
          <div key={i} className="h-14 rounded-xl mt-3 animate-pulse" style={{ background: 'var(--fs-cream-200)' }} />
        ))}
      </div>
    )
  }

  // Empty
  if (display.length === 0) {
    return (
      <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-100)' }}>
            <StickyNote size={16} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>Notes</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--fs-text-muted)' }}>
          {filterContent
            ? `No notes matching "${filterContent}" found.`
            : 'No saved notes yet. Ask me to save a note!'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden fs-animate-in"
      style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-100)' }}>
            <StickyNote size={16} strokeWidth={1.8} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>
              Your Notes
            </span>
            <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ background: 'var(--fs-sage-100)', color: 'var(--fs-sage-700)' }}>
              {filtered.length} note{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="px-4 pb-4 space-y-2 mt-1">
        {display.map((note, idx) => {
          const date = new Date(note.createdAt || 0)
          const timeAgo = getTimeAgo(date)

          return (
            <div key={note.id || idx} className="rounded-xl p-3.5 transition-all"
              style={{
                background: 'white',
                border: '1px solid var(--fs-cream-200)',
                animationDelay: `${idx * 60}ms`,
              }}>
              <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--fs-text-primary)' }}>
                {note.content}
              </p>

              <div className="flex items-center gap-3 mt-2">
                <span className="text-[11px]" style={{ color: 'var(--fs-text-muted)' }}>
                  {timeAgo}
                </span>

                {note.sourceSearch && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
                    style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-600)' }}>
                    <Search size={10} strokeWidth={2} />
                    {note.sourceSearch}
                  </span>
                )}

                {note.linkedCollection && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
                    style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-muted)' }}>
                    <Link2 size={10} strokeWidth={2} />
                    Linked
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {remaining > 0 && (
        <div className="px-5 pb-4">
          <div className="text-xs flex items-center gap-1.5 font-medium"
            style={{ color: 'var(--fs-sage-600)' }}>
            <ArrowRight size={12} strokeWidth={2} />
            {remaining} more note{remaining !== 1 ? 's' : ''} — switch to Notes tab to see all
          </div>
        </div>
      )}
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const notesInlineComponent: TamboComponent = {
  name: 'NotesInline',
  description: `Show the user's saved notes inline in chat. Use when user asks:
- "Show my notes"
- "What notes have I saved?"
- "List my notes"
- After saving a note (to confirm it was saved)
Renders compact note cards with content preview, timestamps, and source search tags.`,
  component: NotesInline,
  propsSchema: NotesInlinePropsSchema,
}