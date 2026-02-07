// components/dialog/QuickActionDialog.tsx
// REDESIGNED: Cream/Sage palette, themed inputs, sage primary button
'use client'

import { X, FolderPlus } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Collection { id: string; name: string }

interface QuickActionDialogProps {
  isOpen: boolean; onClose: () => void; action: 'bookmark' | 'schedule' | 'note';
  item: { title: string; url: string; snippet?: string; type: 'article' | 'repo' | 'image'; thumbnail?: string }
}

export function QuickActionDialog({ isOpen, onClose, action, item }: QuickActionDialogProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [eventDatetime, setEventDatetime] = useState('')
  const [eventNote, setEventNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && action === 'bookmark') loadCollections()
    if (isOpen && action === 'schedule') { setEventTitle(item.title); setEventNote(`From: ${item.url}`) }
    if (isOpen && action === 'note') setNoteContent(`${item.title}\n\n${item.snippet || ''}\n\nSource: ${item.url}`)
  }, [isOpen, action])

  const loadCollections = async () => {
    try { const response = await fetch('/api/collections'); if (response.ok) { const data = await response.json(); setCollections(data.collections || []) } } catch {}
  }

  const handleBookmark = async () => {
    setLoading(true)
    try {
      const collectionName = selectedCollection === 'new' ? newCollectionName : collections.find(c => c.id === selectedCollection)?.name || ''
      const response = await fetch('/api/tools/collection/add', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionName, items: [{ type: item.type, url: item.url, title: item.title, thumbnail: item.thumbnail }] }) })
      if (response.ok) onClose()
    } catch {} finally { setLoading(false) }
  }

  const handleSchedule = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tools/calendar/create', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: eventTitle, datetime: new Date(eventDatetime).toISOString(), note: eventNote }) })
      if (response.ok) onClose()
    } catch {} finally { setLoading(false) }
  }

  const handleSaveNote = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tools/note/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: noteContent }) })
      if (response.ok) onClose()
    } catch {} finally { setLoading(false) }
  }

  if (!isOpen) return null

  const inputStyle: React.CSSProperties = { background: 'var(--fs-cream-100)', border: '2px solid var(--fs-border-light)', color: 'var(--fs-text-primary)', transitionDuration: 'var(--fs-duration-fast)' }
  const inputFocus = (e: React.FocusEvent<any>) => { e.currentTarget.style.borderColor = 'var(--fs-sage-400)' }
  const inputBlur = (e: React.FocusEvent<any>) => { e.currentTarget.style.borderColor = 'var(--fs-border-light)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(31,46,31,0.5)' }} onClick={onClose}>
      <div className="rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto fs-scrollbar fs-animate-scale-in"
        style={{ background: 'var(--fs-cream-50)' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 sticky top-0 z-10 rounded-t-2xl" style={{ background: 'var(--fs-cream-50)', borderBottom: '1px solid var(--fs-border-light)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--fs-text-primary)' }}>
            {action === 'bookmark' && 'Add to Collection'}
            {action === 'schedule' && 'Schedule Reminder'}
            {action === 'note' && 'Save as Note'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
            <X size={18} style={{ color: 'var(--fs-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Preview */}
          <div className="rounded-xl p-3" style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-border-light)' }}>
            <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--fs-text-primary)' }}>{item.title}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--fs-text-muted)' }}>{item.url}</p>
          </div>

          {/* Bookmark */}
          {action === 'bookmark' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fs-text-primary)' }}>Select Collection</label>
                <select value={selectedCollection} onChange={(e) => setSelectedCollection(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors" style={inputStyle}
                  onFocus={inputFocus} onBlur={inputBlur}>
                  <option value="">Choose a collection...</option>
                  {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="new">+ Create New Collection</option>
                </select>
              </div>
              {selectedCollection === 'new' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fs-text-primary)' }}>New Collection Name</label>
                  <input type="text" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="Enter collection name..."
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              )}
            </>
          )}

          {/* Schedule */}
          {action === 'schedule' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fs-text-primary)' }}>Event Title</label>
                <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fs-text-primary)' }}>Date &amp; Time</label>
                <input type="datetime-local" value={eventDatetime} onChange={(e) => setEventDatetime(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fs-text-primary)' }}>Note (optional)</label>
                <textarea value={eventNote} onChange={(e) => setEventNote(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-y min-h-20 transition-colors" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
              </div>
            </>
          )}

          {/* Note */}
          {action === 'note' && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fs-text-primary)' }}>Note Content</label>
              <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-y min-h-[150px] transition-colors" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 flex justify-end gap-2" style={{ borderTop: '1px solid var(--fs-border-light)', background: 'var(--fs-cream-100)' }}>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)', transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-300)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}>Cancel</button>
          <button
            onClick={() => { if (action === 'bookmark') handleBookmark(); else if (action === 'schedule') handleSchedule(); else handleSaveNote() }}
            disabled={loading || (action === 'bookmark' && !selectedCollection && !newCollectionName)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--fs-sage-600)', transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--fs-sage-700)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)' }}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}