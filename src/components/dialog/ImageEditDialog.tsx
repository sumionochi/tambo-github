// components/dialog/ImageEditDialog.tsx
// REDESIGNED: Cream/Sage palette, sage header, themed controls
'use client'

import { X, Sparkles, Loader } from 'lucide-react'
import { useState } from 'react'

interface ImageEditDialogProps {
  isOpen: boolean
  onClose: () => void
  image: { imageIndex: number; imageUrl: string; title: string; photographer: string }
}

export function ImageEditDialog({ isOpen, onClose, image }: ImageEditDialogProps) {
  const [prompt, setPrompt] = useState('')
  const [variations, setVariations] = useState(1)
  const [loading, setLoading] = useState(false)

  const handleEdit = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const response = await fetch('/api/tools/image/edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIndex: image.imageIndex, editPrompt: prompt, variationCount: variations }),
      })
      if (response.ok) { onClose() }
    } catch (error) { console.error('Image edit error:', error) }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(31,46,31,0.55)' }} onClick={onClose}>
      <div className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto fs-scrollbar fs-animate-scale-in"
        style={{ background: 'var(--fs-cream-50)' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ background: 'var(--fs-sage-50)', borderBottom: '1px solid var(--fs-border-light)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--fs-sage-600)' }}>
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>Edit Image with AI</h2>
              <p className="text-sm" style={{ color: 'var(--fs-text-muted)' }}>Transform this image using AI generation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
            <X size={18} style={{ color: 'var(--fs-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image Preview */}
          <div className="relative rounded-xl overflow-hidden" style={{ background: 'var(--fs-cream-200)' }}>
            <img src={image.imageUrl} alt={image.title} className="w-full h-64 object-cover" />
            <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, rgba(31,46,31,0.8) 0%, transparent 100%)' }}>
              <p className="text-white text-sm font-medium">{image.title}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>by {image.photographer}</p>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--fs-text-primary)' }}>What would you like to change?</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} autoFocus
              placeholder="e.g., make it sunset, add rain, change to winter scene..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-y min-h-[100px] transition-colors"
              style={{ background: 'var(--fs-cream-100)', border: '2px solid var(--fs-border-light)', color: 'var(--fs-text-primary)', transitionDuration: 'var(--fs-duration-fast)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--fs-sage-400)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fs-border-light)' }} />
            <div className="flex items-start gap-2 mt-2">
              <Sparkles size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--fs-sage-500)' }} />
              <p className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>Be specific about what you want to add, remove, or change</p>
            </div>
          </div>

          {/* Variations */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--fs-text-primary)' }}>Number of variations</label>
            <div className="flex items-center gap-4">
              <input type="range" min="1" max="4" value={variations} onChange={(e) => setVariations(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer" style={{ background: 'var(--fs-cream-300)', accentColor: 'var(--fs-sage-600)' }} />
              <span className="text-2xl font-bold w-8 text-center" style={{ color: 'var(--fs-sage-600)' }}>{variations}</span>
            </div>
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--fs-text-muted)' }}>
              <span>Faster</span><span>More options</span>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--fs-sage-50)', border: '1px solid var(--fs-sage-200)' }}>
            <Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--fs-sage-600)' }} />
            <p className="text-sm" style={{ color: 'var(--fs-sage-800)' }}>
              <span className="font-semibold">How it works:</span> Your image will be processed to generate {variations} variation{variations > 1 ? 's' : ''} based on your prompt. Check the Studio tab to view results!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 flex justify-between items-center" style={{ borderTop: '1px solid var(--fs-border-light)', background: 'var(--fs-cream-100)' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)', transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-300)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}>Cancel</button>
          <button onClick={handleEdit} disabled={loading || !prompt.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--fs-sage-600)', transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--fs-sage-700)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)' }}>
            {loading ? <><Loader size={15} className="animate-spin" /> Generating...</> : <><Sparkles size={15} /> Generate Variations</>}
          </button>
        </div>
      </div>
    </div>
  )
}