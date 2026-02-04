// app/api/tools/image/generate/route.ts
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prismaUser = await ensureUserExists(supabaseUser);
    const { imageUrl, editPrompt, count = 4 } = await request.json();

    console.log("🎨 Image edit request:");
    console.log("   Image URL:", imageUrl);
    console.log("   Edit prompt:", editPrompt);
    console.log("   Count:", count);

    // Generate variations directly from provided URL
    const variations = await generateImageVariations(
      imageUrl,
      editPrompt,
      count
    );

    // Save to database
    await prisma.generatedImage.create({
      data: {
        userId: prismaUser.id,
        originalUrl: imageUrl,
        variations: variations as any,
      },
    });

    const message = `Generated ${variations.length} variations. Check the Studio tab!`;
    console.log("✅", message);

    return NextResponse.json({
      success: true,
      variations,
      message,
    });
  } catch (error: any) {
    console.error("❌ Image generation error:", error);
    return NextResponse.json(
      { success: false, variations: [], message: `Failed: ${error.message}` },
      { status: 500 }
    );
  }
}
