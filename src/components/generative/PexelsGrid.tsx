// components/generative/PexelsGrid.tsx
'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useTamboStreamStatus } from '@tambo-ai/react'
import { Download, Edit, Save, ExternalLink } from 'lucide-react'

// Zod Schema
export const PexelsGridPropsSchema = z.object({
  searchRequest: z.object({
    query: z.string().describe('Search query for images'),
    perPage: z.number().optional().describe('Number of images to fetch'),
  }).describe('Image search parameters'),
})

type PexelsGridProps = z.infer<typeof PexelsGridPropsSchema>

interface PexelsPhoto {
  id: string
  url: string
  imageUrl: string
  thumbnail: string
  photographer: string
  title: string
}

export function PexelsGrid({ searchRequest }: PexelsGridProps) {
  const [photos, setPhotos] = useState<PexelsPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ Correct Tambo usage
  const { streamStatus } = useTamboStreamStatus()

  // derive isStreaming (this is the key fix)
  const isStreaming =
    !streamStatus.isSuccess && !streamStatus.isError

  useEffect(() => {
    if (!searchRequest?.query || isStreaming) return

    const fetchPhotos = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/search/pexels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchRequest),
        })

        if (!response.ok) {
          throw new Error('Image search failed')
        }

        const data = await response.json()
        setPhotos(data.photos ?? [])
      } catch (err: any) {
        setError(err.message ?? 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()
  }, [searchRequest?.query, isStreaming])

  /* ---------------- streaming ---------------- */

  if (isStreaming) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-600 mt-2">
          Searching images...
        </p>
      </div>
    )
  }

  /* ---------------- loading ---------------- */

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 rounded-lg animate-pulse"
          />
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

  if (photos.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No images found for "{searchRequest.query}"</p>
      </div>
    )
  }

  /* ---------------- grid ---------------- */

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Images: "{searchRequest.query}"
        </h3>
        <span className="text-sm text-gray-500">
          {photos.length} photos
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
          >
            <img
              src={photo.imageUrl}
              alt={photo.title}
              className="w-full h-full object-cover"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-end">
              <div className="w-full p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs mb-2">
                  Photo by {photo.photographer}
                </p>

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1 bg-white text-gray-900 text-xs py-1.5 rounded hover:bg-gray-100">
                    <Edit size={12} />
                    Edit
                  </button>

                  <button className="flex-1 flex items-center justify-center gap-1 bg-white text-gray-900 text-xs py-1.5 rounded hover:bg-gray-100">
                    <Save size={12} />
                    Save
                  </button>

                  <a
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-white text-gray-900 rounded hover:bg-gray-100"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const pexelsGridComponent = {
  name: 'PexelsGrid',
  description:
    'Displays a grid of images from Pexels. Use when user searches for photos or images. Component fetches data automatically.',
  component: PexelsGrid,
  propsSchema: PexelsGridPropsSchema,
}
