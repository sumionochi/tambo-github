// app/api/search/web/route.ts
import { NextResponse } from "next/server";
import { searchWeb } from "@/lib/apis/google-serp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, filters } = body.searchRequest || body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const results = await searchWeb(query, filters);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Web search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
