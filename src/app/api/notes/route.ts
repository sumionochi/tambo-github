// app/api/notes/route.ts
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
      return NextResponse.json({ notes: [] });
    }

    const prismaUser = await ensureUserExists(supabaseUser);

    const notes = await prisma.note.findMany({
      where: { userId: prismaUser.id },
      orderBy: { createdAt: "desc" },
    });

    const formattedNotes = notes.map((note) => ({
      id: note.id,
      content: note.content,
      sourceSearch: note.sourceSearch,
      linkedCollection: note.linkedCollectionId,
      createdAt: note.createdAt.toISOString(),
    }));

    return NextResponse.json({ notes: formattedNotes });
  } catch (error: any) {
    console.error("Load notes error:", error);
    return NextResponse.json({ notes: [] });
  }
}
