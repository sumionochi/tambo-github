// app/api/tools/image/edit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { generateImageVariations } from "@/lib/apis/openai";
import { ensureUserExists } from "@/lib/utils/sync-user";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
          variationsGenerated: 0,
        },
        { status: 401 }
      );
    }

    const prismaUser = await ensureUserExists(supabaseUser);
    const { imageIndex, editPrompt, variationCount = 1 } = await request.json(); // ← Changed default to 1

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎨 IMAGE EDIT REQUEST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Image index:", imageIndex);
    console.log("Edit prompt:", editPrompt);
    console.log("Variation count:", variationCount); // ← Log the count

    // Get the most recent Pexels search session for this user
    const session = await prisma.searchSession.findFirst({
      where: {
        userId: prismaUser.id,
        source: "pexels",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No recent image search found. Please search for images first.",
          variationsGenerated: 0,
        },
        { status: 404 }
      );
    }

    const photos = session.results as any[];

    console.log("✅ USING MOST RECENT PEXELS SEARCH");
    console.log("   Session ID:", session.id);
    console.log("   Query:", session.query);
    console.log("   Created:", session.createdAt.toISOString());
    console.log("   Total images:", photos.length);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (imageIndex >= photos.length) {
      return NextResponse.json(
        {
          success: false,
          message: `Image #${imageIndex + 1} not found. Only ${
            photos.length
          } images in the search results for "${session.query}".`,
          variationsGenerated: 0,
        },
        { status: 400 }
      );
    }

    const selectedImage = photos[imageIndex];

    console.log("✅ SELECTED IMAGE");
    console.log("   Index:", imageIndex, `(#${imageIndex + 1})`);
    console.log("   Title:", selectedImage.title);
    console.log("   URL:", selectedImage.imageUrl);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Generate variations
    const variations = await generateImageVariations(
      selectedImage.imageUrl,
      editPrompt,
      variationCount // ← Pass the count
    );

    // Save to database
    await prisma.generatedImage.create({
      data: {
        userId: prismaUser.id,
        originalUrl: selectedImage.imageUrl,
        variations: variations as any,
      },
    });

    const message =
      variationCount === 1
        ? "Image variation generated! Click the Studio tab to view it."
        : `${variations.length} image variations generated! Click the Studio tab to view them.`;

    console.log("✅ SUCCESS: Generated", variations.length, "variation(s)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return NextResponse.json({
      success: true,
      message,
      variationsGenerated: variations.length,
    });
  } catch (error: any) {
    console.error("❌ IMAGE EDIT ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Error: ${error.message}`,
        variationsGenerated: 0,
      },
      { status: 500 }
    );
  }
}
