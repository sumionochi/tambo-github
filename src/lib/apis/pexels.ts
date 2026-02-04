// lib/apis/pexels.ts

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

export interface PexelsPhoto {
  id: string;
  url: string;
  imageUrl: string;
  thumbnail: string;
  photographer: string;
  title: string;
  width: number;
  height: number;
  alt?: string;
}
// lib/apis/pexels.ts

export async function searchPexels(
  query: string,
  options?: {
    perPage?: number;
    page?: number;
  }
): Promise<PexelsPhoto[]> {
  if (!PEXELS_API_KEY) {
    console.warn("⚠️ PEXELS_API_KEY not found");
    return [];
  }

  try {
    const params = new URLSearchParams({
      query: query,
      per_page: (options?.perPage || 12).toString(),
      page: (options?.page || 1).toString(),
    });

    console.log("🔍 Pexels search:", query);

    const response = await fetch(
      `https://api.pexels.com/v1/search?${params.toString()}`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();

    const photos = data.photos.map((photo: any) => ({
      id: photo.id.toString(),
      url: photo.url,
      imageUrl: photo.src.large,
      thumbnail: photo.src.medium,
      photographer: photo.photographer,
      title: photo.alt || `Photo by ${photo.photographer}`,
      width: photo.width,
      height: photo.height,
      alt: photo.alt,
    }));

    console.log("✅ Pexels returned", photos.length, "images");

    return photos;
  } catch (error) {
    console.error("Pexels search error:", error);
    throw error;
  }
}
