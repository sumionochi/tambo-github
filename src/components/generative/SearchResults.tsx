// components/generative/SearchResults.tsx
'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useTamboStreamStatus } from '@tambo-ai/react'
import { ExternalLink, Bookmark, Calendar, FileText } from 'lucide-react'

// Zod Schema
export const SearchResultsPropsSchema = z.object({
  searchRequest: z.object({
    query: z.string().describe("Search query text"),
    filters: z.object({
      num: z.number().optional().describe("Number of results"),
      freshness: z.enum(['day', 'week', 'month']).optional().describe("Freshness filter"),
    }).optional(),
  }).describe("Search parameters - component will fetch data"),
})

type SearchResultsProps = z.infer<typeof SearchResultsPropsSchema>

interface SearchResult {
  id: string
  title: string
  url: string
  snippet: string
  thumbnail?: string
  source: string
}

export function SearchResults({ searchRequest }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { streamStatus } = useTamboStreamStatus()

  const isStreaming =
    !streamStatus.isSuccess && !streamStatus.isError

    useEffect(() => {
      if (!searchRequest?.query || isStreaming) return
  
      const fetchResults = async () => {
        setLoading(true)
        setError(null)
  
        try {
          const response = await fetch('/api/search/web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchRequest),
          })
  
          if (!response.ok) throw new Error('Search failed')
  
          const data = await response.json()
          const fetchedResults = data.results || []
          setResults(fetchedResults)
          
          // Log results in a format the AI can understand
          console.log('📊 Search results available for bookmarking:', 
            fetchedResults.map((r: SearchResult, i: number) => ({
              index: i,
              type: 'article',
              url: r.url,
              title: r.title,
              thumbnail: r.thumbnail,
            }))
          )
        } catch (err: any) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }
  
      fetchResults()
    }, [searchRequest?.query, isStreaming])
  

  /* ---------------- streaming state ---------------- */

  if (isStreaming) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-600 mt-2">
          Searching the web...
        </p>
      </div>
    )
  }

  /* ---------------- loading skeleton ---------------- */

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-full mb-1" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
        ))}
      </div>
    )
  }

  /* ---------------- error ---------------- */

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">Error: {error}</p>
      </div>
    )
  }

  /* ---------------- empty ---------------- */

  if (results.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No results found for "{searchRequest.query}"</p>
      </div>
    )
  }

  /* ---------------- results ---------------- */

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Search Results for "{searchRequest.query}"
        </h3>
        <span className="text-sm text-gray-500">
          {results.length} results
        </span>
      </div>

      {results.map((result) => (
        <div
          key={result.id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex gap-3">
            {result.thumbnail && (
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-20 h-20 rounded object-cover shrink-0"
              />
            )}

            <div className="flex-1 min-w-0">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:text-blue-700 flex items-start gap-2 group"
              >
                <span className="line-clamp-2">
                  {result.title}
                </span>
                <ExternalLink
                  size={14}
                  className="shrink-0 mt-1 opacity-0 group-hover:opacity-100"
                />
              </a>

              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {result.snippet}
              </p>

              <p className="text-xs text-gray-500 mt-2">
                {result.source}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">
              <Bookmark size={14} />
              Bookmark
            </button>
            <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">
              <Calendar size={14} />
              Schedule
            </button>
            <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">
              <FileText size={14} />
              Save Note
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export const searchResultsComponent = {
  name: 'SearchResults',
  description:
    'Displays web search results from Google. Use when user searches for articles, websites, or information. Component fetches data automatically.',
  component: SearchResults,
  propsSchema: SearchResultsPropsSchema,
}
