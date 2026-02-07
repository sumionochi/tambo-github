// components/dialogs/SearchHistoryDialog.tsx
// REDESIGNED: Cream/Sage palette, themed result cards, soft overlay
'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, Loader2 } from 'lucide-react'

interface SearchResult { id: string; title: string; url: string; snippet: string; thumbnail?: string; source: string }

interface SearchHistoryDialogProps { isOpen: boolean; onClose: () => void; searchQuery: string }

export function SearchHistoryDialog({ isOpen, onClose, searchQuery }: SearchHistoryDialogProps) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [fromCache, setFromCache] = useState(false)

  useEffect(() => { if (isOpen && searchQuery) loadSearchResults() }, [isOpen, searchQuery])

  const loadSearchResults = async () => {
    setLoading(true); setResults([]); setFromCache(false)
    try {
      const sessionRes = await fetch(`/api/search-sessions?query=${encodeURIComponent(searchQuery)}&source=google`)
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        if (sessionData.results && sessionData.results.length > 0) { setResults(sessionData.results); setFromCache(true); return }
      }
      const response = await fetch('/api/search/web', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchRequest: { query: searchQuery, num: 10 } }) })
      if (response.ok) { const data = await response.json(); setResults(data.results || []) }
    } catch (error) { console.error('Failed to load search results:', error) }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(31,46,31,0.5)' }} onClick={onClose}>
      <div className="rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col fs-animate-scale-in"
        style={{ background: 'var(--fs-cream-50)' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 rounded-t-2xl" style={{ borderBottom: '1px solid var(--fs-border-light)' }}>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--fs-text-primary)' }}>Search Results</h2>
            <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--fs-text-muted)' }}>&quot;{searchQuery}&quot;</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-all ml-4" style={{ transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
            <X size={18} style={{ color: 'var(--fs-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto fs-scrollbar p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
              <p className="ml-3" style={{ color: 'var(--fs-text-secondary)' }}>Loading results...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg font-medium" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>No results found</p>
              <p className="text-sm mt-2" style={{ color: 'var(--fs-text-muted)' }}>Try searching again from the Search tab</p>
            </div>
          ) : (
            <div className="space-y-3 fs-stagger">
              {results.map((result) => (
                <div key={result.id} className="rounded-xl p-4 transition-all fs-animate-in"
                  style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-border-light)', transitionDuration: 'var(--fs-duration-normal)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)'; e.currentTarget.style.borderColor = 'var(--fs-sage-200)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--fs-border-light)' }}>
                  <div className="flex gap-3">
                    {result.thumbnail && (
                      <img src={result.thumbnail} alt={result.title} className="w-20 h-20 rounded-xl object-cover shrink-0" style={{ border: '1px solid var(--fs-border-light)' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="font-semibold flex items-start gap-2 group transition-colors"
                        style={{ color: 'var(--fs-sage-700)', transitionDuration: 'var(--fs-duration-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fs-sage-800)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-sage-700)' }}>
                        <span className="line-clamp-2">{result.title}</span>
                        <ExternalLink size={14} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--fs-sage-500)' }} />
                      </a>
                      <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--fs-text-secondary)' }}>{result.snippet}</p>
                      <p className="text-xs mt-2" style={{ color: 'var(--fs-text-muted)' }}>{result.source}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 flex justify-between items-center rounded-b-2xl" style={{ borderTop: '1px solid var(--fs-border-light)', background: 'var(--fs-cream-100)' }}>
          <p className="text-sm" style={{ color: 'var(--fs-text-muted)' }}>
            {results.length > 0 && <>Showing {results.length} results{fromCache && <span className="ml-1" style={{ color: 'var(--fs-sage-500)' }}>(saved)</span>}</>}
          </p>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: 'var(--fs-sage-700)', transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-800)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-700)' }}>Close</button>
        </div>
      </div>
    </div>
  )
}