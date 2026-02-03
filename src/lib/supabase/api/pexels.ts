// lib/apis/pexels.ts

const PEXELS_API_KEY = process.env.PEXELS_API_KEY!;

export async function searchPexels(query: string, perPage = 20) {
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query
    )}&per_page=${perPage}`,
    {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Pexels API error");
  }

  const data = await response.json();

  return data.photos.map((photo: any) => ({
    id: photo.id.toString(),
    url: photo.url,
    imageUrl: photo.src.large,
    thumbnail: photo.src.medium,
    photographer: photo.photographer,
    title: `Photo by ${photo.photographer}`,
    width: photo.width,
    height: photo.height,
  }));
}

export async function searchPexelsCurated(perPage = 20) {
  const response = await fetch(
    `https://api.pexels.com/v1/curated?per_page=${perPage}`,
    {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Pexels API error");
  }

  const data = await response.json();

  return data.photos.map((photo: any) => ({
    id: photo.id.toString(),
    url: photo.url,
    imageUrl: photo.src.large,
    thumbnail: photo.src.medium,
    photographer: photo.photographer,
    title: `Photo by ${photo.photographer}`,
    width: photo.width,
    height: photo.height,
  }));
}
