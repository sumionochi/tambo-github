// components/layout/ControlBar.tsx
'use client'

import { Search, BookMarked, Calendar, FileText, Palette, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type WorkspaceView = 'search' | 'collections' | 'calendar' | 'notes' | 'studio'

interface ControlBarProps {
  activeView: WorkspaceView
  onViewChange: (view: WorkspaceView) => void
  userEmail: string
}

export function ControlBar({ activeView, onViewChange, userEmail }: ControlBarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const tabs = [
    { id: 'search' as const, label: 'Search', icon: Search },
    { id: 'collections' as const, label: 'Collections', icon: BookMarked },
    { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
    { id: 'notes' as const, label: 'Notes', icon: FileText },
    { id: 'studio' as const, label: 'Studio', icon: Palette },
  ]

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-linear-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">F</span>
        </div>
        <h1 className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          FlowSearch AI
        </h1>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                ${isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <Icon size={18} />
              <span className="text-sm">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* User Menu */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{userEmail}</span>
        <button
          onClick={handleSignOut}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  )
}