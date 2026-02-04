// app/api/search-history/route.ts
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
      return NextResponse.json({ history: [] });
    }

    const prismaUser = await ensureUserExists(supabaseUser);

    const history = await prisma.searchHistory.findMany({
      where: { userId: prismaUser.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Load search history error:", error);
    return NextResponse.json({ history: [] });
  }
}
