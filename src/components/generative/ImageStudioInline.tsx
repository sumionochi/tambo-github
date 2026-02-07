// components/generative/ImageStudioInline.tsx
// Renders generated/edited images inline in the chat thread
'use client'

import { z } from 'zod'
import type { TamboComponent } from '@tambo-ai/react'
import { useEffect, useState } from 'react'
import { Sparkles, Download, ArrowRight } from 'lucide-react'

// ─── Schema ───
export const ImageStudioInlinePropsSchema = z.object({
  maxImages: z.number().nullable().default(4).describe("Max images to show"),
})

const _parse = ImageStudioInlinePropsSchema.parse.bind(ImageStudioInlinePropsSchema)
const _safeParse = ImageStudioInlinePropsSchema.safeParse.bind(ImageStudioInlinePropsSchema)
;(ImageStudioInlinePropsSchema as any).parse = (d: unknown, p?: any) => _parse(d ?? {}, p)
;(ImageStudioInlinePropsSchema as any).safeParse = (d: unknown, p?: any) => _safeParse(d ?? {}, p)

type Props = z.infer<typeof ImageStudioInlinePropsSchema>

interface StudioImage {
  id: string
  originalUrl: string
  variations: string[]
  createdAt: string
}

function ImageStudioInline({ maxImages }: Props) {
  const [images, setImages] = useState<StudioImage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/studio')
      if (res.ok) {
        const data = await res.json()
        setImages(data.images || [])
      }
    } catch (e) {
      console.error('ImageStudioInline fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  const display = images.slice(0, maxImages || 4)
  const remaining = images.length - display.length

  // Collect all variation URLs for display
  const allVariations = display.flatMap(img =>
    (img.variations || []).map((v, i) => ({ url: v, id: `${img.id}-${i}`, createdAt: img.createdAt }))
  )

  // Loading
  if (loading) {
    return (
      <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-100)' }}>
            <Sparkles size={16} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <div className="h-4 w-28 rounded-lg animate-pulse" style={{ background: 'var(--fs-cream-300)' }} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square rounded-xl animate-pulse" style={{ background: 'var(--fs-cream-200)' }} />
          ))}
        </div>
      </div>
    )
  }

  // Empty
  if (allVariations.length === 0) {
    return (
      <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-100)' }}>
            <Sparkles size={16} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>Image Studio</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--fs-text-muted)' }}>
          No generated images yet. Search for images with Pexels and ask me to edit one!
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
            <Sparkles size={16} strokeWidth={1.8} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>
              Image Studio
            </span>
            <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ background: 'var(--fs-sage-100)', color: 'var(--fs-sage-700)' }}>
              {allVariations.length} variation{allVariations.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Image grid */}
      <div className="px-4 pb-4 mt-1">
        <div className="grid grid-cols-3 gap-2">
          {allVariations.slice(0, 6).map((v, idx) => (
            <div key={v.id} className="relative group rounded-xl overflow-hidden aspect-square"
              style={{
                border: '1px solid var(--fs-cream-200)',
                animationDelay: `${idx * 80}ms`,
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.url} alt={`Variation ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <a href={v.url} download={`variation-${idx + 1}.png`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-white/90 shadow-sm">
                  <Download size={14} style={{ color: 'var(--fs-text-primary)' }} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {allVariations.length > 6 && (
          <p className="text-[11px] mt-2" style={{ color: 'var(--fs-text-muted)' }}>
            +{allVariations.length - 6} more variation{allVariations.length - 6 !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Footer */}
      {remaining > 0 && (
        <div className="px-5 pb-4">
          <div className="text-xs flex items-center gap-1.5 font-medium"
            style={{ color: 'var(--fs-sage-600)' }}>
            <ArrowRight size={12} strokeWidth={2} />
            {remaining} more generation{remaining !== 1 ? 's' : ''} — switch to Studio tab to see all
          </div>
        </div>
      )}
    </div>
  )
}

export const imageStudioInlineComponent: TamboComponent = {
  name: 'ImageStudioInline',
  description: `Show AI-generated/edited images inline in chat. Use when user asks:
- "Show my generated images"
- "What images have I edited?"
- "Show my studio"
- After generating an image variation (to show the result inline instead of requiring tab switch)
Renders a compact grid of image variations with download buttons.`,
  component: ImageStudioInline,
  propsSchema: ImageStudioInlinePropsSchema,
}