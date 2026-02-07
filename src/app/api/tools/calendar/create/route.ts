// app/api/tools/calendar/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

/** Map tool searchType → DB source field */
function mapSearchTypeToSource(searchType: string): string {
  switch (searchType) {
    case "web":
      return "google";
    case "pexels":
      return "pexels";
    case "github":
      return "github";
    default:
      return searchType;
  }
}

interface LinkedItem {
  title: string;
  url: string;
  type: "article" | "repo" | "image";
  source: string;
}

/** Extract rich linked items from cached search results by index */
function extractLinkedItems(
  searchResults: any[],
  indices: number[],
  searchType: string
): LinkedItem[] {
  return indices
    .filter((i) => i >= 0 && i < searchResults.length)
    .map((i) => {
      const r = searchResults[i];

      if (searchType === "web") {
        return {
          title: r.title || "Untitled",
          url: r.url || r.link || "",
          type: "article" as const,
          source: r.source || "",
        };
      } else if (searchType === "pexels") {
        return {
          title: r.title || r.alt || "Image",
          url: r.url || r.src?.original || "",
          type: "image" as const,
          source: r.photographer || "Pexels",
        };
      } else if (searchType === "github") {
        return {
          title: r.fullName || r.full_name || r.name || "Repo",
          url: r.url || r.html_url || "",
          type: "repo" as const,
          source: r.owner || "GitHub",
        };
      }
      return null;
    })
    .filter((item): item is LinkedItem => item !== null);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prismaUser = await ensureUserExists(supabaseUser);

    const {
      title,
      datetime,
      note,
      linkedCollectionId,
      // NEW: search result references
      searchQuery,
      searchType,
      indices,
    } = await request.json();

    console.log("📅 Creating calendar event:", { title, datetime });

    // ─── Resolve search results into rich linked items ───
    let linkedItems: LinkedItem[] = [];

    if (
      searchQuery &&
      searchType &&
      Array.isArray(indices) &&
      indices.length > 0
    ) {
      const dbSource = mapSearchTypeToSource(searchType);

      console.log("🔗 Resolving search results for linked items:", {
        searchQuery,
        searchType,
        dbSource,
        indices,
      });

      // Look up cached search session
      try {
        const session = await prisma.searchSession.findFirst({
          where: {
            userId: prismaUser.id,
            query: searchQuery,
            source: dbSource,
          },
          orderBy: { createdAt: "desc" },
        });

        if (session && Array.isArray(session.results)) {
          linkedItems = extractLinkedItems(
            session.results as any[],
            indices,
            searchType
          );
          console.log(
            `✅ Resolved ${linkedItems.length} linked items from session:`,
            linkedItems.map((i) => i.title)
          );
        } else {
          console.warn("⚠️ No cached session found for:", searchQuery);
        }
      } catch (sessionError) {
        console.warn("⚠️ Session lookup failed:", sessionError);
      }
    }

    // Create the event with rich linked items
    const event = await prisma.calendarEvent.create({
      data: {
        userId: prismaUser.id,
        title,
        datetime: new Date(datetime),
        note: note || "",
        linkedCollectionId: linkedCollectionId || null,
        linkedItems: linkedItems as any, // Stored as JSON — rich objects with url/title
        completed: false,
      },
    });

    const linkedSuffix =
      linkedItems.length > 0
        ? ` with ${linkedItems.length} linked result${
            linkedItems.length > 1 ? "s" : ""
          }`
        : "";

    console.log("✅ Created calendar event:", event.id, linkedSuffix);

    return NextResponse.json({
      success: true,
      eventId: event.id,
      message: `Created event "${title}"${linkedSuffix}`,
    });
  } catch (error: any) {
    console.error("❌ Create calendar event error:", error);
    return NextResponse.json(
      { success: false, eventId: "", message: error.message },
      { status: 500 }
    );
  }
}
