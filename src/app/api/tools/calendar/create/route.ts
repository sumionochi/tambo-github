// app/api/tools/calendar/create/route.ts
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

    const { title, datetime, note, linkedCollectionId, linkedItems } =
      await request.json();

    console.log("📅 Creating calendar event:", { title, datetime });

    const event = await prisma.calendarEvent.create({
      data: {
        userId: prismaUser.id, // ← Use Prisma user ID, not supabaseUser.id
        title,
        datetime: new Date(datetime),
        note: note || "",
        linkedCollectionId: linkedCollectionId || null,
        linkedItems: (linkedItems || []) as any,
        completed: false,
      },
    });

    console.log("✅ Created calendar event:", event.id);

    return NextResponse.json({
      success: true,
      eventId: event.id,
      message: `Created event "${title}"`,
    });
  } catch (error: any) {
    console.error("❌ Create calendar event error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
