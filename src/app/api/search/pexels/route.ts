// app/api/search/pexels/route.ts
import { NextResponse } from "next/server";
import { searchPexels } from "@/lib/apis/pexels";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, perPage } = body.searchRequest || body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    // Search
    const photos = await searchPexels(query, { perPage: perPage || 12 });

    // Save search session if user is authenticated
    let searchSessionId: string | null = null;

    if (supabaseUser) {
      try {
        const prismaUser = await ensureUserExists(supabaseUser);

        // Save the exact results for later reference
        const session = await prisma.searchSession.create({
          data: {
            userId: prismaUser.id,
            query,
            source: "pexels",
            results: photos as any,
          },
        });

        searchSessionId = session.id;
        console.log("✅ Saved search session:", searchSessionId);

        // Also save to SearchHistory
        await prisma.searchHistory.create({
          data: {
            userId: prismaUser.id,
            query,
            source: "pexels",
            filters: perPage ? ({ perPage } as any) : null,
            resultsCount: photos.length,
          },
        });
      } catch (historyError) {
        console.error("Failed to save search session:", historyError);
      }
    }

    return NextResponse.json({
      photos,
      searchSessionId, // ← Return this to frontend
    });
  } catch (error: any) {
    console.error("Pexels search error:", error);
    return NextResponse.json(
      { error: error.message || "Image search failed" },
      { status: 500 }
    );
  }
}
