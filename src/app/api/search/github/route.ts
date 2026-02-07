// app/api/search/github/route.ts
import { NextResponse } from "next/server";
import { searchRepositories } from "@/lib/apis/github";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, language, stars, sort } = body.searchRequest || body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    // Search
    const repos = await searchRepositories(query, {
      language,
      stars,
      sort,
      limit: 10,
    });

    // Save search session + history if user is authenticated
    if (supabaseUser) {
      try {
        const prismaUser = await ensureUserExists(supabaseUser);

        // Save exact results for later retrieval (bookmarking, calendar linking)
        await prisma.searchSession.create({
          data: {
            userId: prismaUser.id,
            query,
            source: "github",
            results: repos as any,
          },
        });

        // Also save to SearchHistory for the history list
        await prisma.searchHistory.create({
          data: {
            userId: prismaUser.id,
            query,
            source: "github",
            filters: { language, stars, sort } as any,
            resultsCount: repos.length,
          },
        });

        console.log("✅ Saved GitHub search history + session:", query);
      } catch (historyError) {
        console.error("Failed to save search history:", historyError);
      }
    }

    return NextResponse.json({ repos });
  } catch (error: any) {
    console.error("GitHub search error:", error);
    return NextResponse.json(
      { error: error.message || "GitHub search failed" },
      { status: 500 }
    );
  }
}
