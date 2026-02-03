// lib/apis/google-serp.ts

const SERP_API_KEY = process.env.GOOGLE_SERP_API_KEY!;

export async function searchWeb(query: string, num = 10) {
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    api_key: SERP_API_KEY,
    num: num.toString(),
  });

  const response = await fetch(
    `https://serpapi.com/search?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Google SERP API error");
  }

  const data = await response.json();

  return (data.organic_results || []).map((result: any) => ({
    id: result.position.toString(),
    title: result.title,
    url: result.link,
    snippet: result.snippet,
    thumbnail: result.thumbnail,
    source: result.source || new URL(result.link).hostname,
  }));
}

export async function searchImages(query: string, num = 20) {
  const params = new URLSearchParams({
    engine: "google_images",
    q: query,
    api_key: SERP_API_KEY,
    num: num.toString(),
  });

  const response = await fetch(
    `https://serpapi.com/search?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Google SERP API error");
  }

  const data = await response.json();

  return (data.images_results || []).map((result: any, index: number) => ({
    id: index.toString(),
    title: result.title,
    imageUrl: result.original,
    thumbnail: result.thumbnail,
    source: result.source,
    url: result.link,
  }));
}
