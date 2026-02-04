// app/api/calendar/route.ts
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
      return NextResponse.json({ events: [] });
    }

    const prismaUser = await ensureUserExists(supabaseUser);

    const events = await prisma.calendarEvent.findMany({
      where: { userId: prismaUser.id },
      orderBy: { datetime: "asc" },
    });

    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      datetime: event.datetime.toISOString(),
      note: event.note,
      completed: event.completed,
      linkedCollection: event.linkedCollectionId,
      linkedItems: (event.linkedItems as string[]) || [],
    }));

    return NextResponse.json({ events: formattedEvents });
  } catch (error: any) {
    console.error("Load calendar error:", error);
    return NextResponse.json({ events: [] });
  }
}
