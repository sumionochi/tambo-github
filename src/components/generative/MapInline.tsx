// components/generative/MapInline.tsx
// Renders an interactive map directly in the chat thread — no tab switch needed
// Supports: place search, city exploration, route planning with driving directions
'use client'

import { z } from 'zod'
import type { TamboComponent } from '@tambo-ai/react'
import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  MapPin, Navigation, Loader, ExternalLink, Compass,
  Clock, Route, ArrowRight, Car,
} from 'lucide-react'

// ─── Dynamic Map import (SSR-safe) ───
const Map = dynamic(
  () => import('@/components/tambo/map').then((mod) => mod.Map),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full flex items-center justify-center rounded-xl"
        style={{ height: 300, background: 'var(--fs-cream-200)' }}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader
            size={20}
            className="animate-spin"
            style={{ color: 'var(--fs-sage-500)' }}
          />
          <span className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>
            Loading map…
          </span>
        </div>
      </div>
    ),
  },
)

// ─── Schema ───
export const MapInlinePropsSchema = z.object({
  query: z
    .string()
    .nullable()
    .default('')
    .describe(
      'Search query. For routes, separate stops with "|" (e.g., "Paris|Berlin|Prague")',
    ),
  mode: z
    .string()
    .nullable()
    .default('search')
    .describe('Map mode: search, explore, or route'),
})

// Tambo streaming safety
const _parse = MapInlinePropsSchema.parse.bind(MapInlinePropsSchema)
const _safeParse = MapInlinePropsSchema.safeParse.bind(MapInlinePropsSchema)
;(MapInlinePropsSchema as any).parse = (d: unknown, p?: any) => {
  try { return _parse(d ?? {}, p) }
  catch { return { query: '', mode: 'search' } }
}
;(MapInlinePropsSchema as any).safeParse = (d: unknown, p?: any) => {
  try { return _safeParse(d ?? {}, p) }
  catch { return { success: true, data: { query: '', mode: 'search' } } }
}

type Props = z.infer<typeof MapInlinePropsSchema>

interface MarkerItem {
  lat: number
  lng: number
  label: string
  shortLabel?: string
  fullName?: string
  type?: string
  id: string
  stopNumber?: number
}

interface RouteLeg {
  distance: number  // meters
  duration: number  // seconds
}

interface RouteData {
  geometry: [number, number][]
  totalDistance: number   // meters
  totalDuration: number  // seconds
  legs: RouteLeg[]
}

interface MapResult {
  title: string
  center: { lat: number; lng: number }
  zoom: number
  markers: MarkerItem[]
  route?: RouteData | null
}

// Mode metadata
const MODE_META: Record<string, { label: string; icon: any }> = {
  search: { label: 'Location Search', icon: MapPin },
  explore: { label: 'City Explorer', icon: Compass },
  route: { label: 'Route Planner', icon: Navigation },
}

// ─── Formatting helpers ───
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.round((seconds % 3600) / 60)
  if (hrs === 0) return `${mins} min`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  if (km < 100) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

function MapInline({ query, mode }: Props) {
  const [result, setResult] = useState<MapResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasRun = useRef(false)

  // Normalize
  const safeQuery = (typeof query === 'string' ? query : '').trim()
  const safeMode = ['search', 'explore', 'route'].includes(mode || '')
    ? (mode as string) : 'search'
  const meta = MODE_META[safeMode] || MODE_META.search
  const ModeIcon = meta.icon
  const isRoute = safeMode === 'route'

  // ── Fetch map data ──
  const fetchMap = async () => {
    if (!safeQuery) { setError('No location query provided'); setLoading(false); return }
    setLoading(true); setError(null)

    try {
      let apiQuery = safeQuery
      if (isRoute) {
        apiQuery = safeQuery.split(/,|→| to /gi).map(s => s.trim()).filter(Boolean).join('|')
      }

      const url = `/api/map/geocode?mode=${safeMode}&q=${encodeURIComponent(apiQuery)}&limit=10`
      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Map search failed')
      if (!data.results?.length) throw new Error('No locations found. Try a different search.')

      const center = data.center || { lat: data.results[0].lat, lng: data.results[0].lng }

      let zoom = 12
      if (safeMode === 'explore') zoom = 11
      if (isRoute) zoom = data.results.length <= 2 ? 6 : 5

      let title = ''
      if (safeMode === 'search') title = safeQuery
      else if (safeMode === 'explore') title = `Exploring ${safeQuery}`
      else if (isRoute) {
        const stops = data.results.map((m: any) => m.shortLabel || m.label.replace(/^Stop \d+:\s*/, ''))
        title = stops.join(' → ')
      }

      // Extract route data if present
      let routeData: RouteData | null = null
      if (data.route) {
        routeData = {
          geometry: data.route.geometry || [],
          totalDistance: data.route.totalDistance || 0,
          totalDuration: data.route.totalDuration || 0,
          legs: data.route.legs || [],
        }
      }

      setResult({ title, center, zoom, markers: data.results, route: routeData })
    } catch (err: any) {
      setError(err.message || 'Failed to load map')
    } finally {
      setLoading(false)
    }
  }

  // ── Debounced auto-run ──
  useEffect(() => {
    if (hasRun.current || !safeQuery) return
    const timer = setTimeout(() => {
      if (hasRun.current) return
      hasRun.current = true
      fetchMap()
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeQuery, safeMode])

  // ═══════════════════════════════════════
  //  LOADING
  // ═══════════════════════════════════════
  if (loading) {
    return (
      <div className="rounded-2xl overflow-hidden fs-animate-in"
        style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--fs-sage-100)' }}>
            <ModeIcon size={16} strokeWidth={1.8} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{meta.label}</span>
            {safeQuery && <span className="text-xs ml-2" style={{ color: 'var(--fs-text-muted)' }}>{safeQuery}</span>}
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="rounded-xl overflow-hidden animate-pulse"
            style={{ height: 240, background: 'var(--fs-cream-200)' }}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader size={20} className="animate-spin mx-auto mb-2" style={{ color: 'var(--fs-sage-400)' }} />
                <span className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>
                  {isRoute ? 'Calculating route & driving directions…' :
                   safeMode === 'explore' ? 'Discovering landmarks…' : 'Searching locations…'}
                </span>
              </div>
            </div>
          </div>
          {isRoute && (
            <div className="mt-3 rounded-xl animate-pulse" style={{ height: 72, background: 'var(--fs-cream-200)' }} />
          )}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 rounded-lg mt-2 animate-pulse"
              style={{ background: 'var(--fs-cream-200)', animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  //  ERROR
  // ═══════════════════════════════════════
  if (error) {
    return (
      <div className="rounded-2xl overflow-hidden fs-animate-in"
        style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--fs-sage-100)' }}>
            <ModeIcon size={16} strokeWidth={1.8} style={{ color: 'var(--fs-sage-600)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{meta.label}</span>
        </div>
        <div className="px-5 pb-4">
          <div className="rounded-xl p-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="text-sm" style={{ color: '#B91C1C' }}>⚠️ {error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!result) return null

  const hasRoute = isRoute && result.route && result.route.geometry.length >= 2

  // ═══════════════════════════════════════
  //  MAP + RESULTS
  // ═══════════════════════════════════════
  return (
    <div className="rounded-2xl overflow-hidden fs-animate-in"
      style={{ background: 'var(--fs-cream-100)', border: '1px solid var(--fs-cream-300)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: isRoute ? '#3D643D' : 'var(--fs-sage-100)' }}>
            <ModeIcon size={16} strokeWidth={1.8}
              style={{ color: isRoute ? 'white' : 'var(--fs-sage-600)' }} />
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>
              {result.title}
            </span>
            <span className="text-xs ml-2 px-2 py-0.5 rounded-full"
              style={{ background: 'var(--fs-sage-100)', color: 'var(--fs-sage-700)' }}>
              {result.markers.length} stop{result.markers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Route Summary Card ── */}
      {hasRoute && result.route && (
        <div className="mx-4 mb-2 rounded-xl p-4 fs-animate-in"
          style={{ background: 'linear-gradient(135deg, #3D643D 0%, #5B8F5B 100%)', animationDelay: '50ms' }}>
          <div className="flex items-center gap-5">
            {/* Total Duration */}
            <div className="flex items-center gap-2">
              <Clock size={16} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.8)' }} />
              <div>
                <p className="text-lg font-bold text-white leading-tight">
                  {formatDuration(result.route.totalDuration)}
                </p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  drive time
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.25)' }} />

            {/* Total Distance */}
            <div className="flex items-center gap-2">
              <Route size={16} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.8)' }} />
              <div>
                <p className="text-lg font-bold text-white leading-tight">
                  {formatDistance(result.route.totalDistance)}
                </p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  total distance
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.25)' }} />

            {/* Mode */}
            <div className="flex items-center gap-2">
              <Car size={16} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.8)' }} />
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Driving</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  via roads
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Map ── */}
      <div className="px-4 pb-2">
        <div className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--fs-cream-200)', height: 320 }}>
          <Map
            center={result.center}
            zoom={result.zoom}
            markers={result.markers}
            zoomControl={true}
            size="full"
            rounded="none"
            routeLine={hasRoute && result.route ? result.route.geometry : undefined}
            routeColor="#3D643D"
            numberedMarkers={isRoute}
            fitBounds={isRoute}
          />
        </div>
      </div>

      {/* ── Route Leg Breakdown ── */}
      {hasRoute && result.route && result.route.legs.length > 0 && (
        <div className="px-4 pb-2">
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'white', border: '1px solid var(--fs-cream-200)' }}>
            {result.markers.map((marker, idx) => {
              const leg = result.route!.legs[idx] // leg from THIS stop to NEXT
              const isLast = idx === result.markers.length - 1
              const shortName = marker.shortLabel || marker.label.replace(/^Stop \d+:\s*/, '')

              return (
                <div key={marker.id || idx}>
                  {/* Stop Row */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5"
                    style={{ borderBottom: isLast ? 'none' : undefined }}>

                    {/* Numbered circle */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{
                        background: idx === 0 ? '#3D643D' : isLast ? '#B91C1C' : '#5B8F5B',
                        color: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }}>
                      {idx + 1}
                    </div>

                    {/* Stop info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--fs-text-primary)' }}>
                        {shortName}
                      </p>
                      {marker.fullName && marker.fullName !== shortName && (
                        <p className="text-[10px] truncate" style={{ color: 'var(--fs-text-muted)' }}>
                          {marker.fullName}
                        </p>
                      )}
                    </div>

                    {/* Label */}
                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: idx === 0 ? '#3D643D12' : isLast ? '#B91C1C12' : 'var(--fs-sage-50)',
                        color: idx === 0 ? '#3D643D' : isLast ? '#B91C1C' : 'var(--fs-sage-600)',
                      }}>
                      {idx === 0 ? 'START' : isLast ? 'END' : `STOP ${idx + 1}`}
                    </span>
                  </div>

                  {/* Leg connector (between stops) */}
                  {!isLast && leg && (
                    <div className="flex items-center gap-3 px-3.5 py-1.5"
                      style={{ background: 'var(--fs-cream-50)', borderTop: '1px solid var(--fs-cream-200)', borderBottom: '1px solid var(--fs-cream-200)' }}>
                      {/* Dotted line indicator */}
                      <div className="w-7 flex justify-center shrink-0">
                        <div className="w-0.5 h-4 rounded-full" style={{ background: 'var(--fs-sage-300)' }} />
                      </div>
                      <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--fs-text-muted)' }}>
                        <ArrowRight size={10} strokeWidth={2.5} style={{ color: 'var(--fs-sage-400)' }} />
                        <span className="font-semibold" style={{ color: 'var(--fs-sage-700)' }}>
                          {formatDuration(leg.duration)}
                        </span>
                        <span>·</span>
                        <span>{formatDistance(leg.distance)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Location List (non-route modes) ── */}
      {!isRoute && result.markers.length > 0 && (
        <div className="px-4 pb-4 space-y-1.5 mt-1">
          {result.markers.slice(0, 8).map((marker, idx) => (
            <div key={marker.id || idx}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
              style={{ background: 'white', border: '1px solid var(--fs-cream-200)', transitionDuration: 'var(--fs-duration-fast)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--fs-sage-300)'; e.currentTarget.style.background = 'var(--fs-sage-50)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--fs-cream-200)'; e.currentTarget.style.background = 'white' }}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
                style={{ background: 'var(--fs-sage-100)', color: 'var(--fs-sage-700)' }}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--fs-text-primary)' }}>{marker.label}</p>
                {marker.fullName && marker.fullName !== marker.label && (
                  <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>{marker.fullName}</p>
                )}
              </div>
              {marker.type && (
                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-600)' }}>
                  {marker.type}
                </span>
              )}
              <a href={`https://www.openstreetmap.org/?mlat=${marker.lat}&mlon=${marker.lng}#map=15/${marker.lat}/${marker.lng}`}
                target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 rounded transition-colors"
                style={{ color: 'var(--fs-text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--fs-sage-600)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--fs-text-muted)' }}
                title="Open in OpenStreetMap">
                <ExternalLink size={11} strokeWidth={2} />
              </a>
            </div>
          ))}
          {result.markers.length > 8 && (
            <div className="text-[11px] font-medium px-3 py-1.5" style={{ color: 'var(--fs-text-muted)' }}>
              +{result.markers.length - 8} more — switch to Map tab to see all
            </div>
          )}
        </div>
      )}

      {/* Spacer for route mode */}
      {isRoute && <div className="h-3" />}
    </div>
  )
}

// ─── Tambo Registration ───
export const mapInlineComponent: TamboComponent = {
  name: 'MapInline',
  description: `Render an interactive map with driving directions directly in the chat. Use for ANY location-related request:
- "Find coffee shops in Berlin" → mode="search", query="coffee shops in Berlin"
- "Find restaurants near Times Square" → mode="search", query="restaurants near Times Square"
- "Explore landmarks in Tokyo" → mode="explore", query="Tokyo"
- "Show me Paris" → mode="explore", query="Paris"
- "Plan a route from Mumbai to Delhi" → mode="route", query="Mumbai|Delhi"
- "Route from Paris to Berlin to Prague" → mode="route", query="Paris|Berlin|Prague"

Route mode shows: actual driving road path on map, total drive time, total distance, per-leg time/distance breakdown, numbered stop markers.
ALWAYS use MapInline for location queries in chat. NEVER tell users to "go to the Map tab" — render the map inline instead.
For route mode: separate stops with "|" in the query prop.`,
  component: MapInline,
  propsSchema: MapInlinePropsSchema,
}