// app/api/studio/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ images: [] });
    }

    const prismaUser = await ensureUserExists(supabaseUser);

    const images = await prisma.generatedImage.findMany({
      where: { userId: prismaUser.id },
      orderBy: { createdAt: "desc" },
      take: 10, // Get last 10
    });

    const formattedImages = images.map((img) => ({
      id: img.id,
      originalUrl: img.originalUrl,
      variations: (img.variations as string[]) || [],
      createdAt: img.createdAt.toISOString(),
    }));

    console.log("🎨 Loaded", formattedImages.length, "generated images");

    return NextResponse.json({ images: formattedImages });
  } catch (error: any) {
    console.error("Load studio images error:", error);
    return NextResponse.json({ images: [] });
  }
}
