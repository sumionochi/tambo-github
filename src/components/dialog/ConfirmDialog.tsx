// components/dialogs/ConfirmDialog.tsx
// REDESIGNED: Cream/Sage palette, soft overlay, themed buttons
'use client'

import { X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; confirmText?: string; confirmStyle?: 'danger' | 'primary';
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmStyle = 'danger' }: ConfirmDialogProps) {
  if (!isOpen) return null

  const handleConfirm = () => { onConfirm(); onClose() }

  const confirmBg = confirmStyle === 'danger' ? '#DC2626' : 'var(--fs-sage-600)'
  const confirmHoverBg = confirmStyle === 'danger' ? '#B91C1C' : 'var(--fs-sage-700)'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(31,46,31,0.5)' }} onClick={onClose}>
      <div className="rounded-2xl shadow-xl max-w-md w-full fs-animate-scale-in" style={{ background: 'var(--fs-cream-50)' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--fs-border-light)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
            <X size={18} style={{ color: 'var(--fs-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fs-text-secondary)' }}>{message}</p>
        </div>

        {/* Footer */}
        <div className="p-5 flex justify-end gap-2" style={{ borderTop: '1px solid var(--fs-border-light)', background: 'var(--fs-cream-100)' }}>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)', transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-300)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}>Cancel</button>
          <button onClick={handleConfirm} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: confirmBg, transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = confirmHoverBg }}
            onMouseLeave={(e) => { e.currentTarget.style.background = confirmBg }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}