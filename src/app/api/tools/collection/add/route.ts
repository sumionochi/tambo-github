// app/api/tools/collection/add/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";
import { searchWeb } from "@/lib/apis/google-serp";
import { searchPexels } from "@/lib/apis/pexels";
import { searchRepositories } from "@/lib/apis/github";

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
    const body = await request.json();
    const { collectionName, searchQuery, searchType, indices } = body;

    console.log("📦 Bookmark request:", {
      collectionName,
      searchQuery,
      searchType,
      indices,
    });

    // Validate inputs
    if (!searchQuery || !searchType || !Array.isArray(indices)) {
      return NextResponse.json(
        {
          success: false,
          itemsAdded: 0,
          collectionId: "",
          message: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Re-run the search to get results
    let searchResults: any[] = [];

    if (searchType === "web") {
      searchResults = await searchWeb(searchQuery);
    } else if (searchType === "pexels") {
      searchResults = await searchPexels(searchQuery);
    } else if (searchType === "github") {
      searchResults = await searchRepositories(searchQuery, { limit: 20 });
    }

    console.log(`✅ Re-searched and got ${searchResults.length} results`);

    // Extract items at specified indices
    const itemsToAdd = indices
      .filter((index) => index >= 0 && index < searchResults.length)
      .map((index) => {
        const result = searchResults[index];

        // Map based on search type
        if (searchType === "web") {
          return {
            type: "article" as const,
            url: result.url,
            title: result.title,
            thumbnail: result.thumbnail,
          };
        } else if (searchType === "pexels") {
          return {
            type: "image" as const,
            url: result.url,
            title: result.title,
            thumbnail: result.imageUrl,
          };
        } else if (searchType === "github") {
          return {
            type: "repo" as const,
            url: result.url,
            title: result.fullName || result.name,
            thumbnail: undefined,
          };
        }
        return null;
      })
      .filter((item) => item !== null);

    console.log(`✅ Extracted ${itemsToAdd.length} valid items`);

    if (itemsToAdd.length === 0) {
      return NextResponse.json(
        {
          success: false,
          itemsAdded: 0,
          collectionId: "",
          message: "No valid items found at those indices",
        },
        { status: 400 }
      );
    }

    // Find or create collection
    let collection = await prisma.collection.findFirst({
      where: { userId: prismaUser.id, name: collectionName },
    });

    if (!collection) {
      collection = await prisma.collection.create({
        data: { userId: prismaUser.id, name: collectionName, items: [] },
      });
    }

    // Add items with IDs
    const existingItems = (collection.items as any[]) || [];
    const newItems = itemsToAdd.map((item) => ({
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));

    await prisma.collection.update({
      where: { id: collection.id },
      data: { items: [...existingItems, ...newItems] },
    });

    console.log(`✅ Added ${newItems.length} items to "${collectionName}"`);

    return NextResponse.json({
      success: true,
      collectionId: collection.id,
      itemsAdded: newItems.length,
      message: `Added ${newItems.length} items to "${collectionName}"`,
    });
  } catch (error: any) {
    console.error("❌ Collection add error:", error);
    return NextResponse.json(
      {
        success: false,
        itemsAdded: 0,
        collectionId: "",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
