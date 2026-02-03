// app/api/search/pexels/route.ts
import { NextResponse } from "next/server";
import { searchPexels } from "@/lib/apis/pexels";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, perPage } = body.searchRequest || body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const photos = await searchPexels(query, { perPage });

    return NextResponse.json({ photos });
  } catch (error: any) {
    console.error("Pexels search error:", error);
    return NextResponse.json(
      { error: error.message || "Image search failed" },
      { status: 500 }
    );
  }
}
