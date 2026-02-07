// components/generative/CollectionsInline.tsx
// Renders saved collections inline in the chat thread
'use client'

import { z } from 'zod'
import type { TamboComponent } from '@tambo-ai/react'
import { useEffect, useState } from 'react'
import { Bookmark, ExternalLink, Globe, GitBranch, Image as ImageIcon, Pin, ArrowRight, Folder } from 'lucide-react'

// ─── Schema ───
export const CollectionsInlinePropsSchema = z.object({
  collectionName: z.string().nullable().default('').describe("Filter to a specific collection by name (empty = show all)"),
  maxCollections: z.number().nullable().default(3).describe("Max collections to show"),
  maxItemsPerCollection: z.number().nullable().default(5).describe("Max items per collection"),
})

const _parse = CollectionsInlinePropsSchema.parse.bind(CollectionsInlinePropsSchema)
const _safeParse = CollectionsInlinePropsSchema.safeParse.bind(CollectionsInlinePropsSchema)
;(CollectionsInlinePropsSchema as any).parse = (d: unknown, p?: any) => _parse(d ?? {}, p)
;(CollectionsInlinePropsSchema as any).safeParse = (d: unknown, p?: any) => _safeParse(d ?? {}, p)

type Props = z.infer<typeof CollectionsInlinePropsSchema>

interface CollectionItem {
  id: string
  type: string
  title: string
  url: string
  imageUrl?: string
}

interface Collection {
  id: string
  name: string
  items: CollectionItem[]
}

const typeConfig: Record<string, { icon: any; bg: string; text: string }> = {
  article: { icon: Globe, bg: 'var(--fs-sage-50)', text: 'var(--fs-sage-700)' },
  pin:     { icon: Pin, bg: '#FFF7ED', text: '#9A3412' },
  repo:    { icon: GitBranch, bg: '#EFF6FF', text: '#1D4ED8' },
  image:   { icon: ImageIcon, bg: '#FDF2F8', text: '#BE185D' },
}

function CollectionsInline({ collectionName, maxCollections, maxItemsPerCollection }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/collections')
      if (res.ok) {
        const data = await res.json()
        setCollections(data.collections || [])
      }
    } catch (e) {
      console.error('CollectionsInline fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  // Filter
  let filtered = [...collections]
  if (collectionName) {
    const q = (collectionName || '').toLowerCase()
    filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(q))
  }
  const display = filtered.slice(0, maxCollections || 3)
  const remaining = filtered.length - display.length

  // Loading
  if (loading) {
    return (
      <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-100)' }}>
            <Bookmark size={16} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <div className="h-4 w-32 rounded-lg animate-pulse" style={{ background: 'var(--fs-cream-300)' }} />
        </div>
        {[1, 2].map(i => (
          <div key={i} className="h-20 rounded-xl mt-3 animate-pulse" style={{ background: 'var(--fs-cream-200)' }} />
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
            <Bookmark size={16} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>Collections</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--fs-text-muted)' }}>
          {collectionName
            ? `No collection matching "${collectionName}" found.`
            : 'No saved collections yet. Try bookmarking some search results!'}
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
            <Bookmark size={16} strokeWidth={1.8} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>
              {collectionName ? `"${collectionName}"` : 'Your Collections'}
            </span>
            <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ background: 'var(--fs-sage-100)', color: 'var(--fs-sage-700)' }}>
              {filtered.reduce((sum, c) => sum + (c.items?.length || 0), 0)} items
            </span>
          </div>
        </div>
      </div>

      {/* Collections */}
      <div className="px-4 pb-4 space-y-3 mt-1">
        {display.map((col, cidx) => {
          const items = (col.items || []).slice(0, maxItemsPerCollection || 5)
          const moreItems = (col.items || []).length - items.length

          return (
            <div key={col.id || cidx} className="rounded-xl overflow-hidden"
              style={{
                background: 'white',
                border: '1px solid var(--fs-cream-200)',
                animationDelay: `${cidx * 80}ms`,
              }}>
              {/* Collection name */}
              <div className="px-3.5 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--fs-cream-200)' }}>
                <Folder size={14} strokeWidth={1.8} style={{ color: 'var(--fs-sage-500)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>
                  {col.name}
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-md ml-auto"
                  style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-muted)' }}>
                  {(col.items || []).length} item{(col.items || []).length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Items */}
              <div className="divide-y" style={{ borderColor: 'var(--fs-cream-100)' }}>
                {items.map((item, iidx) => {
                  const tc = typeConfig[item.type || 'article'] || typeConfig.article
                  const Icon = tc.icon
                  return (
                    <a key={item.id || iidx} href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3.5 py-2 transition-colors group/item"
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--fs-cream-50)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: tc.bg }}>
                        <Icon size={11} strokeWidth={2} style={{ color: tc.text }} />
                      </span>
                      <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--fs-text-primary)' }}>
                        {item.title || item.url}
                      </span>
                      <ExternalLink size={10} strokeWidth={2}
                        className="shrink-0 opacity-0 group-hover/item:opacity-60 transition-opacity"
                        style={{ color: 'var(--fs-text-muted)' }} />
                    </a>
                  )
                })}
              </div>

              {moreItems > 0 && (
                <div className="px-3.5 py-2 text-[11px]" style={{ color: 'var(--fs-text-muted)', borderTop: '1px solid var(--fs-cream-100)' }}>
                  +{moreItems} more item{moreItems !== 1 ? 's' : ''}
                </div>
              )}
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
            {remaining} more collection{remaining !== 1 ? 's' : ''} — switch to Collections tab to see all
          </div>
        </div>
      )}
    </div>
  )
}

export const collectionsInlineComponent: TamboComponent = {
  name: 'CollectionsInline',
  description: `Show the user's saved bookmark collections inline in chat. Use when user asks:
- "Show my collections"
- "What have I bookmarked?"
- "Show my saved results"
- "List my bookmarks"
- "Show my Learning Resources collection" (pass collectionName="Learning Resources")
- After bookmarking results (to confirm they were saved)
Renders compact collection cards with clickable item links.`,
  component: CollectionsInline,
  propsSchema: CollectionsInlinePropsSchema,
}