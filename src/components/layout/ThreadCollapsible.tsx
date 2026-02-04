// components/layout/ThreadCollapsible.tsx
'use client'

import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ThreadCollapsibleProps {
  collapsed: boolean
  onToggle: () => void
  userId: string
}

interface SearchHistoryItem {
  id: string
  query: string
  source: string
  createdAt: string
  resultsCount: number | null
}

export function ThreadCollapsible({ collapsed, onToggle, userId }: ThreadCollapsibleProps) {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSearchHistory()
  }, [userId])

  const loadSearchHistory = async () => {
    try {
      const response = await fetch('/api/search-history')
      
      if (response.ok) {
        const data = await response.json()
        setSearchHistory(data.history || [])
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (collapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Recent Searches</h2>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded transition-all"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Search History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Loading...
          </div>
        ) : searchHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <SearchIcon size={32} className="mx-auto mb-2 opacity-30" />
            <p>No searches yet</p>
            <p className="text-xs mt-1">Start searching to see history</p>
          </div>
        ) : (
          searchHistory.map((item) => (
            <button
              key={item.id}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-all group"
            >
              <div className="flex items-start gap-2">
                <SearchIcon size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.query}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 capitalize">
                      {item.source}
                    </span>
                    {item.resultsCount && (
                      <span className="text-xs text-gray-400">
                        {item.resultsCount} results
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}