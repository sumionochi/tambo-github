// app/api/tools/note/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
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

    // CRITICAL: Get Prisma user ID
    const prismaUser = await ensureUserExists(supabaseUser);

    const { content, sourceSearch, linkedCollectionId } = await request.json();

    console.log("📝 Creating note");

    const note = await prisma.note.create({
      data: {
        userId: prismaUser.id, // ← Use Prisma user ID
        content,
        sourceSearch: sourceSearch || null,
        linkedCollectionId: linkedCollectionId || null,
      },
    });

    console.log("✅ Created note:", note.id);

    return NextResponse.json({
      success: true,
      noteId: note.id,
      message: "Note created successfully",
    });
  } catch (error: any) {
    console.error("❌ Create note error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
