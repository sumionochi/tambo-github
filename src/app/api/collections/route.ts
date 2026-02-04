// app/api/collections/route.ts
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
      return NextResponse.json({ collections: [] });
    }

    const prismaUser = await ensureUserExists(supabaseUser);

    const collections = await prisma.collection.findMany({
      where: { userId: prismaUser.id },
      orderBy: { updatedAt: "desc" },
    });

    // Transform for frontend
    const formattedCollections = collections.map((col) => ({
      id: col.id,
      name: col.name,
      items: (col.items as any[]) || [],
    }));

    console.log("📚 Loaded", formattedCollections.length, "collections");

    return NextResponse.json({ collections: formattedCollections });
  } catch (error: any) {
    console.error("Load collections error:", error);
    return NextResponse.json({ collections: [] });
  }
}
