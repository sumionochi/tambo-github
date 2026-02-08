// components/interactable/LocationMap.tsx
// REDESIGNED: Uses server-side geocode proxy for reliable Nominatim access
// Fixes: CORS, User-Agent forbidden header, rate limiting, all 4 modes
'use client'

import { z } from 'zod'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { TamboComponent } from '@tambo-ai/react'
import { Search, MapPin, Navigation, Bookmark, Loader, Sparkles, List, Clock, Route, Car, ArrowRight } from 'lucide-react'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

const Map = dynamic(
  () => import('@/components/tambo/map').then((mod) => mod.Map),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full flex items-center justify-center rounded-xl" style={{ background: 'var(--fs-cream-200)' }}>
        <div className="flex flex-col items-center gap-2">
          <Loader size={22} className="animate-spin" style={{ color: 'var(--fs-sage-500)' }} />
          <span className="text-sm" style={{ color: 'var(--fs-text-muted)' }}>Loading map...</span>
        </div>
      </div>
    ),
  }
)

export const LocationMapPropsSchema = z.preprocess(
  (v) => v ?? {},
  z.object({
    mode: z.enum(['place-search', 'city-explorer', 'saved-places', 'route-planner']).optional().nullable().describe("Type of map mode"),
    searchQuery: z.string().optional().nullable().describe("Initial search query"),
  })
)

type LocationMapProps = z.infer<typeof LocationMapPropsSchema>
type MapMode = 'place-search' | 'city-explorer' | 'saved-places' | 'route-planner'

interface MarkerItem {
  lat: number
  lng: number
  label: string
  shortLabel?: string
  fullName?: string
  type?: string
  id: string
}

interface RouteData {
  geometry: [number, number][]
  totalDistance: number
  totalDuration: number
  legs: { distance: number; duration: number }[]
}

interface MapData {
  title: string
  center: { lat: number; lng: number }
  zoom: number
  markers: MarkerItem[]
  route?: RouteData | null
}

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

function LocationMap({ mode: initialMode, searchQuery }: LocationMapProps) {
  const [mode, setMode] = useState<MapMode>((initialMode as MapMode) || 'place-search')
  const [inputValue, setInputValue] = useState(searchQuery || '')
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-search if searchQuery prop is provided
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Place Search (via server proxy) ───
  const searchPlaces = async (query: string) => {
    const res = await fetch(`/api/map/geocode?mode=search&q=${encodeURIComponent(query)}&limit=10`)
    const data = await res.json()

    if (!res.ok) throw new Error(data.error || 'Search failed')
    if (!data.results || data.results.length === 0) throw new Error('No locations found for this query. Try a different search term.')

    setMapData({
      title: `Search: "${query}"`,
      center: { lat: data.results[0].lat, lng: data.results[0].lng },
      zoom: 12,
      markers: data.results,
    })
  }

  // ─── City Explorer (via server proxy — handles sequential rate limiting) ───
  const exploreCity = async (cityName: string) => {
    const res = await fetch(`/api/map/geocode?mode=explore&q=${encodeURIComponent(cityName)}`)
    const data = await res.json()

    if (!res.ok) throw new Error(data.error || 'City exploration failed')
    if (!data.results || data.results.length === 0) throw new Error(`No landmarks found in "${cityName}". Try a major city name.`)

    setMapData({
      title: `Exploring ${cityName}`,
      center: data.center || { lat: data.results[0].lat, lng: data.results[0].lng },
      zoom: 11,
      markers: data.results,
    })
  }

  // ─── Saved Places (from collections) ───
  const loadSavedPlaces = async () => {
    const response = await fetch('/api/collections')
    if (!response.ok) throw new Error('Failed to load collections')
    const data = await response.json()

    const collections = data.collections || []
    if (collections.length === 0) throw new Error('No collections found. Bookmark some search results first!')

    // Collect any items that have location metadata
    const locationItems = collections.flatMap((c: any) =>
      (c.items || []).filter((item: any) => item.metadata?.location)
    )

    if (locationItems.length === 0) {
      // Fallback: try to geocode the first few collection items by title
      const allItems = collections.flatMap((c: any) => (c.items || []).slice(0, 3))
      if (allItems.length === 0) throw new Error('No saved items with location data. Bookmark location-related search results first!')

      // Geocode up to 5 items
      const markers: MarkerItem[] = []
      for (const item of allItems.slice(0, 5)) {
        try {
          const res = await fetch(`/api/map/geocode?mode=search&q=${encodeURIComponent(item.title || item.url || '')}&limit=1`)
          const geo = await res.json()
          if (geo.results && geo.results.length > 0) {
            markers.push({
              ...geo.results[0],
              label: item.title || geo.results[0].label,
              id: `saved-${markers.length}`,
            })
          }
        } catch { /* skip ungeocodable items */ }
      }

      if (markers.length === 0) throw new Error('Could not geocode any saved items. Try saving location-related search results.')

      setMapData({
        title: 'Your Saved Places',
        center: { lat: markers[0].lat, lng: markers[0].lng },
        zoom: 10,
        markers,
      })
      return
    }

    const markers = locationItems.map((item: any, i: number) => ({
      lat: item.metadata.location.coordinates.lat,
      lng: item.metadata.location.coordinates.lng,
      label: item.title,
      id: `saved-${i}`,
    }))

    setMapData({
      title: 'Your Saved Places',
      center: { lat: markers[0].lat, lng: markers[0].lng },
      zoom: 10,
      markers,
    })
  }

  // ─── Route Planner (via server proxy + OSRM) ───
  const planRoute = async (locationsStr: string) => {
    const locations = locationsStr
      .split(/,|→| to /gi)
      .map(l => l.trim())
      .filter(Boolean)

    if (locations.length < 2) throw new Error('Enter at least 2 locations separated by commas (e.g., "Paris, Berlin, Prague")')

    const res = await fetch(`/api/map/geocode?mode=route&q=${encodeURIComponent(locations.join('|'))}`)
    const data = await res.json()

    if (!res.ok) throw new Error(data.error || 'Route planning failed')
    if (!data.results || data.results.length === 0) throw new Error('Could not geocode any of the locations. Check spelling and try again.')

    let routeData: RouteData | null = null
    if (data.route) {
      routeData = {
        geometry: data.route.geometry || [],
        totalDistance: data.route.totalDistance || 0,
        totalDuration: data.route.totalDuration || 0,
        legs: data.route.legs || [],
      }
    }

    setMapData({
      title: `Route: ${locations.join(' → ')}`,
      center: data.center,
      zoom: data.results.length <= 2 ? 6 : 5,
      markers: data.results,
      route: routeData,
    })
  }

  // ─── Unified search handler ───
  const handleSearch = async () => {
    if (!inputValue.trim() && mode !== 'saved-places') {
      setError('Please enter a search query')
      return
    }
    setLoading(true)
    setError(null)
    setMapData(null)
    try {
      switch (mode) {
        case 'place-search': await searchPlaces(inputValue); break
        case 'city-explorer': await exploreCity(inputValue); break
        case 'saved-places': await loadSavedPlaces(); break
        case 'route-planner': await planRoute(inputValue); break
      }
    } catch (err: any) {
      setError(err.message || 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const modes = [
    { id: 'place-search' as const, label: 'Place Search', icon: Search, description: 'Search for any location', placeholder: 'e.g., coffee shops in Seattle' },
    { id: 'city-explorer' as const, label: 'City Explorer', icon: MapPin, description: 'Discover city landmarks', placeholder: 'e.g., Paris, Tokyo, New York' },
    { id: 'saved-places' as const, label: 'Saved Places', icon: Bookmark, description: 'View saved locations', placeholder: 'Click search to load saved places' },
    { id: 'route-planner' as const, label: 'Route Planner', icon: Navigation, description: 'Plan a multi-stop route', placeholder: 'e.g., Paris, Berlin, Prague' },
  ]
  const currentMode = modes.find(m => m.id === mode)

  return (
    <div className="p-6 md:p-8 h-full overflow-auto fs-scrollbar" style={{ background: 'var(--fs-cream-100)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between fs-animate-in">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>Location Explorer</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>Search, explore, and save locations around the world</p>
          </div>
          <EditWithTamboButton tooltip="Modify search with AI" description="Change location search or explore different places" />
        </div>

        {/* Mode Selector */}
        <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--fs-text-muted)', letterSpacing: '0.08em' }}>Exploration Mode</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {modes.map((m) => {
              const Icon = m.icon; const isActive = mode === m.id
              return (
                <button key={m.id} onClick={() => { setMode(m.id); setMapData(null); setError(null) }}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{
                    border: isActive ? '2px solid var(--fs-sage-500)' : '2px solid var(--fs-border-light)',
                    background: isActive ? 'var(--fs-sage-50)' : 'var(--fs-cream-50)',
                    transitionDuration: 'var(--fs-duration-normal)', transitionTimingFunction: 'var(--fs-ease-out)',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--fs-sage-300)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--fs-border-light)' }}>
                  <Icon size={18} strokeWidth={1.8} style={{ color: isActive ? 'var(--fs-sage-600)' : 'var(--fs-text-muted)' }} />
                  <p className="font-medium mt-2 text-sm" style={{ color: isActive ? 'var(--fs-sage-800)' : 'var(--fs-text-primary)' }}>{m.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>{m.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search Input */}
        <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', animationDelay: '50ms' }}>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fs-text-muted)' }}>
                {mode === 'place-search' ? 'Search Location' : mode === 'city-explorer' ? 'City to Explore' : mode === 'saved-places' ? 'Saved Places' : 'Route Stops (comma-separated)'}
              </label>
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder={currentMode?.placeholder}
                disabled={mode === 'saved-places'}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all disabled:opacity-60"
                style={{ background: 'var(--fs-cream-100)', border: '2px solid var(--fs-border-light)', color: 'var(--fs-text-primary)', transitionDuration: 'var(--fs-duration-fast)' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--fs-sage-400)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fs-border-light)' }} />
              <p className="text-xs mt-2" style={{ color: 'var(--fs-text-muted)' }}>
                {mode === 'route-planner' ? 'Enter locations separated by commas or "to" (e.g., Paris to Berlin to Prague)' : mode === 'saved-places' ? 'Click search to load saved locations' : 'Press Enter to search'}
              </p>
            </div>
            <button onClick={handleSearch} disabled={loading || (!inputValue.trim() && mode !== 'saved-places')}
              className="mt-7 px-6 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: 'var(--fs-sage-600)', color: 'white', boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-normal)' }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = 'var(--fs-sage-700)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)' }}>
              {loading ? <><Loader size={16} className="animate-spin" /> Searching...</> : <><Search size={16} /> Search</>}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl p-4 fs-animate-in" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="text-sm font-medium" style={{ color: '#B91C1C' }}>⚠️ {error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl p-12 text-center fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
            <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
            <p className="font-medium" style={{ color: 'var(--fs-text-primary)' }}>
              {mode === 'city-explorer' ? 'Discovering landmarks...' : mode === 'route-planner' ? 'Planning route...' : 'Searching locations...'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>
              {mode === 'city-explorer' ? 'Searching museums, parks, monuments, and more' : 'This may take a moment'}
            </p>
          </div>
        )}

        {/* Map + Results */}
        {mapData && !loading && (
          <div className="space-y-4">

            {/* Route Summary Card */}
            {mode === 'route-planner' && mapData.route && mapData.route.totalDuration > 0 && (
              <div className="rounded-2xl p-5 fs-animate-in"
                style={{ background: 'linear-gradient(135deg, #3D643D 0%, #5B8F5B 100%)', animationDelay: '50ms' }}>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <Clock size={18} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.8)' }} />
                    <div>
                      <p className="text-xl font-bold text-white leading-tight">{formatDuration(mapData.route.totalDuration)}</p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>drive time</p>
                    </div>
                  </div>
                  <div className="h-9 w-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  <div className="flex items-center gap-2.5">
                    <Route size={18} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.8)' }} />
                    <div>
                      <p className="text-xl font-bold text-white leading-tight">{formatDistance(mapData.route.totalDistance)}</p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>total distance</p>
                    </div>
                  </div>
                  <div className="h-9 w-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  <div className="flex items-center gap-2.5">
                    <Car size={18} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.8)' }} />
                    <div>
                      <p className="text-base font-semibold text-white leading-tight">Driving</p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>{mapData.markers.length} stops · via roads</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Map Card */}
            <div className="rounded-2xl overflow-hidden fs-animate-scale-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', boxShadow: 'var(--fs-shadow-sm)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--fs-border-light)' }}>
                <h3 className="text-base font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{mapData.title}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>{mapData.markers.length} location{mapData.markers.length !== 1 ? 's' : ''} found</p>
              </div>
              <div className="p-4">
                <Map
                  center={mapData.center}
                  zoom={mapData.zoom}
                  markers={mapData.markers}
                  zoomControl={true}
                  size="lg"
                  routeLine={mode === 'route-planner' && mapData.route ? mapData.route.geometry : undefined}
                  routeColor="#3D643D"
                  numberedMarkers={mode === 'route-planner'}
                  fitBounds={mode === 'route-planner'}
                />
              </div>
            </div>

            {/* Route: Per-Leg Breakdown */}
            {mode === 'route-planner' && mapData.route && mapData.route.legs.length > 0 && (
              <div className="rounded-2xl overflow-hidden fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', animationDelay: '100ms' }}>
                <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--fs-border-light)' }}>
                  <Navigation size={14} strokeWidth={2} style={{ color: 'var(--fs-sage-600)' }} />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>Route Stops</h3>
                </div>
                {mapData.markers.map((marker, idx) => {
                  const leg = mapData.route!.legs[idx]
                  const isLast = idx === mapData.markers.length - 1
                  const shortName = marker.shortLabel || marker.label.replace(/^Stop \d+:\s*/, '')
                  return (
                    <div key={marker.id || idx}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{
                            background: idx === 0 ? '#3D643D' : isLast ? '#B91C1C' : '#5B8F5B',
                            color: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          }}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--fs-text-primary)' }}>{shortName}</p>
                          {marker.fullName && marker.fullName !== shortName && (
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>{marker.fullName}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0"
                          style={{
                            background: idx === 0 ? '#3D643D14' : isLast ? '#B91C1C14' : 'var(--fs-sage-50)',
                            color: idx === 0 ? '#3D643D' : isLast ? '#B91C1C' : 'var(--fs-sage-600)',
                          }}>
                          {idx === 0 ? 'START' : isLast ? 'END' : `STOP ${idx + 1}`}
                        </span>
                      </div>
                      {!isLast && leg && (
                        <div className="flex items-center gap-3 px-4 py-2"
                          style={{ background: 'var(--fs-cream-100)', borderTop: '1px solid var(--fs-border-light)', borderBottom: '1px solid var(--fs-border-light)' }}>
                          <div className="w-8 flex justify-center shrink-0">
                            <div className="w-0.5 h-5 rounded-full" style={{ background: 'var(--fs-sage-300)' }} />
                          </div>
                          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--fs-text-muted)' }}>
                            <ArrowRight size={12} strokeWidth={2.5} style={{ color: 'var(--fs-sage-400)' }} />
                            <span className="font-semibold" style={{ color: 'var(--fs-sage-700)' }}>{formatDuration(leg.duration)}</span>
                            <span>·</span>
                            <span>{formatDistance(leg.distance)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Location List (non-route modes) */}
            {mode !== 'route-planner' && mapData.markers.length > 0 && (
              <div className="rounded-2xl p-5 fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', animationDelay: '100ms' }}>
                <div className="flex items-center gap-2 mb-3">
                  <List size={15} strokeWidth={2} style={{ color: 'var(--fs-sage-600)' }} />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>Found Locations</h3>
                </div>
                <div className="space-y-2">
                  {mapData.markers.map((marker, idx) => (
                    <div key={marker.id || idx}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                      style={{ background: 'var(--fs-cream-100)', transitionDuration: 'var(--fs-duration-fast)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--fs-sage-50)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--fs-cream-100)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: 'var(--fs-sage-100)', color: 'var(--fs-sage-700)' }}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--fs-text-primary)' }}>
                          {marker.label}
                        </p>
                        {marker.fullName && marker.fullName !== marker.label && (
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>
                            {marker.fullName}
                          </p>
                        )}
                      </div>
                      {marker.type && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0"
                          style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-600)' }}>
                          {marker.type}
                        </span>
                      )}
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--fs-text-muted)' }}>
                        {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty */}
        {!mapData && !loading && !error && (
          <div className="rounded-2xl p-12 text-center fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--fs-sage-50)' }}>
              <MapPin size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>Ready to Explore</h3>
            <p className="text-sm" style={{ color: 'var(--fs-text-muted)', maxWidth: 360, margin: '0 auto' }}>
              Select a mode and search for locations to get started
            </p>
          </div>
        )}

        {/* Tip */}
        <div className="rounded-2xl p-4 flex items-start gap-3 fs-animate-in" style={{ background: 'var(--fs-sage-50)', border: '1px solid var(--fs-sage-200)', animationDelay: '100ms' }}>
          <Sparkles size={18} style={{ color: 'var(--fs-sage-600)' }} className="shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: 'var(--fs-sage-800)' }}>
            <span className="font-semibold">Tip:</span> Use the chat (⌘J) to search — try "Find restaurants near Times Square" or "Plan a route from Paris to Berlin".
          </p>
        </div>
      </div>
    </div>
  )
}

export { LocationMap }

export const locationMapComponent: TamboComponent = {
  name: 'LocationMap',
  description: 'Interactive location search and map visualization with place search, city exploration, saved places, and route planning. Powered by OpenStreetMap and Leaflet.',
  component: LocationMap,
  propsSchema: LocationMapPropsSchema,
}