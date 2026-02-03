// components/generative/RepoExplorer.tsx
'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useTamboStreamStatus } from '@tambo-ai/react'
import { Star, GitFork, Code, ExternalLink, Bookmark } from 'lucide-react'

// Zod Schema
export const RepoExplorerPropsSchema = z.object({
  searchRequest: z.object({
    query: z.string().describe('Search query for repositories'),
    language: z.string().optional().describe('Programming language filter'),
    stars: z.number().optional().describe('Minimum stars filter'),
    sort: z.enum(['stars', 'forks', 'updated']).optional().describe('Sort order'),
  }).describe('GitHub repository search parameters'),
})

type RepoExplorerProps = z.infer<typeof RepoExplorerPropsSchema>

interface GitHubRepo {
  id: string
  name: string
  fullName: string
  description: string
  url: string
  stars: number
  forks: number
  language: string
  updatedAt: string
  owner: string
}

export function RepoExplorer({ searchRequest }: RepoExplorerProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ Correct Tambo usage
  const { streamStatus } = useTamboStreamStatus()

  // derive isStreaming safely
  const isStreaming =
    !streamStatus.isSuccess && !streamStatus.isError

  useEffect(() => {
    if (!searchRequest?.query || isStreaming) return

    const fetchRepos = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/search/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchRequest),
        })

        if (!response.ok) {
          throw new Error('GitHub search failed')
        }

        const data = await response.json()
        setRepos(data.repos ?? [])
      } catch (err: any) {
        setError(err.message ?? 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchRepos()
  }, [searchRequest?.query, isStreaming])

  /* ---------------- streaming ---------------- */

  if (isStreaming) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-600 mt-2">
          Searching GitHub...
        </p>
      </div>
    )
  }

  /* ---------------- loading ---------------- */

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-3 bg-gray-200 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
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

  if (repos.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No repositories found for "{searchRequest.query}"</p>
      </div>
    )
  }

  /* ---------------- results ---------------- */

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          GitHub Repositories: "{searchRequest.query}"
        </h3>
        <span className="text-sm text-gray-500">
          {repos.length} repos
        </span>
      </div>

      {repos.map((repo) => (
        <div
          key={repo.id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2 group"
            >
              <Code size={18} />
              <span>{repo.fullName}</span>
              <ExternalLink
                size={14}
                className="opacity-0 group-hover:opacity-100"
              />
            </a>
          </div>

          {repo.description && (
            <p className="text-sm text-gray-600 mb-3">
              {repo.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600">
            {repo.language && (
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span>{repo.language}</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <Star size={14} />
              <span>{repo.stars.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-1">
              <GitFork size={14} />
              <span>{repo.forks.toLocaleString()}</span>
            </div>

            <span className="text-xs">
              Updated{' '}
              {new Date(repo.updatedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">
              <Bookmark size={14} />
              Bookmark
            </button>
            <button className="text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">
              Explore Files
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export const repoExplorerComponent = {
  name: 'RepoExplorer',
  description:
    'Displays GitHub repositories matching search criteria. Use when user searches for code, repos, or GitHub projects. Component fetches data automatically.',
  component: RepoExplorer,
  propsSchema: RepoExplorerPropsSchema,
}
