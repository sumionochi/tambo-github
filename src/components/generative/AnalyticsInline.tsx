// components/generative/AnalyticsInline.tsx
// Renders analytics chart results directly in chat — no dashboard, no inputs
'use client'

import { z } from 'zod'
import type { TamboComponent } from '@tambo-ai/react'
import { useEffect, useState, useRef } from 'react'
import { Graph } from '@/components/tambo/graph'
import { BarChart3, TrendingUp, Code, Search, AlertCircle } from 'lucide-react'

// ─── Schema ───
// IMPORTANT: Use z.string() not z.enum() — Tambo's streaming/validation 
// passes intermediate values that fail strict enum checks.
export const AnalyticsInlinePropsSchema = z.object({
  analysisType: z.string().nullable().default('github-comparison')
    .describe("Type of analysis: github-comparison, search-trends, language-trends, source-analysis"),
  queries: z.array(z.string().nullable().default('')).nullable().default([])
    .describe("Topics to analyze. For comparisons, pass multiple items: ['React','Vue','Svelte']"),
})

// Tambo streaming safety — handle undefined/null input
const _parse = AnalyticsInlinePropsSchema.parse.bind(AnalyticsInlinePropsSchema)
const _safeParse = AnalyticsInlinePropsSchema.safeParse.bind(AnalyticsInlinePropsSchema)
;(AnalyticsInlinePropsSchema as any).parse = (d: unknown, p?: any) => {
  try { return _parse(d ?? {}, p) } catch { return { analysisType: 'github-comparison', queries: [] } }
}
;(AnalyticsInlinePropsSchema as any).safeParse = (d: unknown, p?: any) => {
  try { return _safeParse(d ?? {}, p) } catch { return { success: true, data: { analysisType: 'github-comparison', queries: [] } } }
}

type Props = z.infer<typeof AnalyticsInlinePropsSchema>

interface ChartData {
  title: string
  data: { type: 'bar' | 'line' | 'pie'; labels: string[]; datasets: Array<{ label: string; data: number[]; color?: string }> }
}

const modeLabels: Record<string, { label: string; icon: any }> = {
  'github-comparison': { label: 'GitHub Comparison', icon: Code },
  'search-trends': { label: 'Search Trends', icon: TrendingUp },
  'language-trends': { label: 'Language Trends', icon: BarChart3 },
  'source-analysis': { label: 'Source Analysis', icon: Search },
}

const SAGE_COLORS = [
  'rgba(91, 143, 91, 0.75)', 'rgba(116, 168, 116, 0.75)', 'rgba(61, 100, 61, 0.75)',
  'rgba(212, 204, 188, 0.85)', 'rgba(157, 195, 157, 0.75)', 'rgba(74, 122, 74, 0.75)',
  'rgba(196, 219, 196, 0.75)', 'rgba(51, 82, 51, 0.75)',
]

type AnalysisMode = 'search-trends' | 'github-comparison' | 'language-trends' | 'source-analysis'

function AnalyticsInline({ analysisType, queries }: Props) {
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasRun = useRef(false)

  // Normalize props (Tambo may pass nulls, partial values, wrong types)
  const mode: AnalysisMode = (['search-trends', 'github-comparison', 'language-trends', 'source-analysis']
    .includes(analysisType || '') ? analysisType : 'github-comparison') as AnalysisMode
  const validQueries = (Array.isArray(queries) ? queries : [])
    .map(q => (typeof q === 'string' ? q : '').trim()).filter(Boolean)
  const modeInfo = modeLabels[mode] || modeLabels['github-comparison']
  const ModeIcon = modeInfo.icon

  // ── Analysis functions ──

  const analyzeSearchTrends = async (topics: string[]) => {
    const results = []
    for (const topic of topics) {
      try {
        const response = await fetch('/api/search/web', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: topic, filters: { num: 10 } }) })
        if (!response.ok) throw new Error('Search failed')
        const data = await response.json()
        results.push({ topic: topic.trim(), count: data.results?.length || 0 })
      } catch { results.push({ topic: topic.trim(), count: 0 }) }
    }
    setChartData({ title: 'Search Interest Comparison', data: { type: 'bar', labels: results.map(r => r.topic), datasets: [{ label: 'Search Results', data: results.map(r => r.count), color: SAGE_COLORS[0] }] } })
  }

  const compareGitHubRepos = async (queryList: string[]) => {
    const repos = []
    for (const query of queryList) {
      try {
        const response = await fetch('/api/search/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query.trim(), sort: 'stars' }) })
        if (!response.ok) throw new Error('GitHub search failed')
        const data = await response.json()
        const topRepo = data.repos?.[0]
        if (topRepo) repos.push({ name: topRepo.name || query.trim(), stars: topRepo.stars || 0, forks: topRepo.forks || 0, watchers: topRepo.watchers || 0 })
      } catch { /* skip */ }
    }
    if (repos.length === 0) throw new Error('No repositories found')
    setChartData({ title: 'GitHub Repository Comparison', data: { type: 'bar', labels: repos.map(r => r.name), datasets: [
      { label: 'Stars', data: repos.map(r => r.stars), color: 'rgba(91, 143, 91, 0.7)' },
      { label: 'Forks', data: repos.map(r => r.forks), color: 'rgba(157, 195, 157, 0.7)' },
      { label: 'Watchers', data: repos.map(r => r.watchers), color: 'rgba(212, 204, 188, 0.8)' },
    ] } })
  }

  const analyzeLanguageTrends = async (topic: string) => {
    const response = await fetch('/api/search/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: topic, sort: 'stars' }) })
    if (!response.ok) throw new Error('GitHub search failed')
    const data = await response.json()
    const repos = data.repos || []
    if (repos.length === 0) throw new Error('No repositories found')
    const languageCounts: Record<string, number> = {}
    repos.forEach((repo: any) => { if (repo.language) languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1 })
    const sorted = Object.entries(languageCounts).sort(([, a], [, b]) => b - a).slice(0, 8)
    setChartData({ title: `Programming Languages in "${topic}"`, data: { type: 'pie', labels: sorted.map(([l]) => l), datasets: [{ label: 'Repositories', data: sorted.map(([, c]) => c), color: SAGE_COLORS[0] }] } })
  }

  const analyzeSearchSources = async (query: string) => {
    const response = await fetch('/api/search/web', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, filters: { num: 10 } }) })
    if (!response.ok) throw new Error('Search failed')
    const data = await response.json()
    const results = data.results || []
    if (results.length === 0) throw new Error('No search results found')
    const categories: Record<string, number> = { News: 0, Academic: 0, Blogs: 0, Commercial: 0, Other: 0 }
    results.forEach((result: any) => {
      const source = result.source?.toLowerCase() || ''; const url = result.url?.toLowerCase() || ''
      if (source.includes('news') || source.includes('times') || source.includes('post')) categories.News++
      else if (url.includes('.edu') || source.includes('arxiv')) categories.Academic++
      else if (source.includes('blog') || source.includes('medium') || url.includes('blog')) categories.Blogs++
      else if (url.includes('.com') || url.includes('.io')) categories.Commercial++
      else categories.Other++
    })
    const filtered = Object.entries(categories).filter(([, c]) => c > 0)
    setChartData({ title: `Source Analysis: "${query}"`, data: { type: 'bar', labels: filtered.map(([c]) => c), datasets: [{ label: 'Sources', data: filtered.map(([, c]) => c), color: SAGE_COLORS[0] }] } })
  }

  // ── Auto-run when queries stabilize (debounce Tambo streaming) ──
  // Tambo streams props progressively: queries might arrive one-by-one.
  // Wait 500ms after last change to ensure all queries have arrived.
  const queriesKey = validQueries.join('|')
  
  useEffect(() => {
    if (hasRun.current) return
    if (validQueries.length === 0) return // Still waiting

    const timer = setTimeout(() => {
      if (hasRun.current) return
      hasRun.current = true

      const run = async () => {
        setLoading(true); setError(null)
        try {
          switch (mode) {
            case 'search-trends': await analyzeSearchTrends(validQueries); break
            case 'github-comparison': await compareGitHubRepos(validQueries); break
            case 'language-trends': await analyzeLanguageTrends(validQueries[0]); break
            case 'source-analysis': await analyzeSearchSources(validQueries[0]); break
          }
        } catch (err: any) { setError(err.message || 'Analysis failed') }
        finally { setLoading(false) }
      }
      run()
    }, 500) // Wait 500ms for streaming to settle

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queriesKey, mode])

  // ── Loading state ──
  if (loading) {
    const isWaiting = validQueries.length === 0
    return (
      <div className="rounded-2xl overflow-hidden fs-animate-in"
        style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-100)' }}>
            <ModeIcon size={16} strokeWidth={1.8} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{modeInfo.label}</span>
            {validQueries.length > 0 && (
              <span className="text-xs ml-2" style={{ color: 'var(--fs-text-muted)' }}>
                {validQueries.join(' vs ')}
              </span>
            )}
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="h-48 rounded-xl animate-pulse flex items-center justify-center"
            style={{ background: 'var(--fs-cream-200)' }}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid var(--fs-sage-300)', borderTopColor: 'var(--fs-sage-600)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--fs-text-muted)' }}>
                {isWaiting ? 'Preparing analysis...' : 'Fetching live data...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="rounded-2xl p-5 fs-animate-in"
        style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#FEF2F2' }}>
            <AlertCircle size={16} strokeWidth={1.8} style={{ color: '#DC2626' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{modeInfo.label}</span>
        </div>
        <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--fs-text-muted)' }}>
          Try asking again or switch to the Analytics tab for manual control.
        </p>
      </div>
    )
  }

  // ── Chart result ──
  if (!chartData) return null

  return (
    <div className="rounded-2xl overflow-hidden fs-animate-in"
      style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>

      {/* Compact header */}
      <div className="px-5 pt-4 pb-1 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-100)' }}>
          <ModeIcon size={16} strokeWidth={1.8} style={{ color: 'var(--fs-sage-600)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>
            {chartData.title}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--fs-sage-100)', color: 'var(--fs-sage-700)' }}>
              {modeInfo.label}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--fs-text-muted)' }}>
              {validQueries.join(' · ')}
            </span>
          </div>
        </div>
      </div>

      {/* Chart - the actual result */}
      <div className="px-4 pb-4 mt-2">
        <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid var(--fs-cream-200)' }}>
          <Graph
            title=""
            data={chartData.data}
            variant="bordered"
            size="lg"
            showLegend={true}
          />
        </div>
      </div>

      {/* Data summary chips */}
      {chartData.data.datasets.length > 0 && chartData.data.labels.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {chartData.data.labels.map((label, i) => {
              const primaryValue = chartData.data.datasets[0]?.data[i]
              return (
                <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg"
                  style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-700)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: SAGE_COLORS[i % SAGE_COLORS.length] }} />
                  {label}
                  {primaryValue !== undefined && (
                    <span style={{ color: 'var(--fs-text-muted)' }}>
                      {typeof primaryValue === 'number' && primaryValue > 1000
                        ? `${(primaryValue / 1000).toFixed(1)}k`
                        : primaryValue}
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export const analyticsInlineComponent: TamboComponent = {
  name: 'AnalyticsInline',
  description: `Render a live analytics chart directly in chat. Auto-fetches data and shows just the chart — no dashboard UI.

ALWAYS use this component (NOT AnalyticsGraph, NOT execute_research_workflow) for chat-triggered analytics:
- "Compare React vs Vue vs Svelte on GitHub" → analysisType="github-comparison", queries=["React","Vue","Svelte"]
- "Show search trends for AI coding assistants" → analysisType="search-trends", queries=["AI coding assistants"]
- "Analyze languages for machine learning" → analysisType="language-trends", queries=["machine learning"]
- "Analyze sources for cloud computing" → analysisType="source-analysis", queries=["cloud computing"]
- "Show me GitHub stats for Next.js vs Remix" → analysisType="github-comparison", queries=["Next.js","Remix"]

For comparisons, split items into separate queries array entries.
This renders INSTANTLY in chat — no mode selectors, no input fields, just the chart.`,
  component: AnalyticsInline,
  propsSchema: AnalyticsInlinePropsSchema,
}