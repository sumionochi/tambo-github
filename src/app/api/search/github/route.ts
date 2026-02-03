// app/api/search/github/route.ts
import { NextResponse } from "next/server";
import { searchRepositories } from "@/lib/apis/github";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, language, stars, sort } = body.searchRequest || body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const repos = await searchRepositories(query, {
      language,
      stars,
      sort,
      limit: 10,
    });

    return NextResponse.json({ repos });
  } catch (error: any) {
    console.error("GitHub search error:", error);
    return NextResponse.json(
      { error: error.message || "GitHub search failed" },
      { status: 500 }
    );
  }
}
