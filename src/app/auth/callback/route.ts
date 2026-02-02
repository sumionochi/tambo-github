import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Parse name from Google's full_name
      const fullName = data.user.user_metadata?.full_name || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;

      await prisma.user.upsert({
        where: { supabaseId: data.user.id },
        update: {
          email: data.user.email!,
          firstName: firstName,
          lastName: lastName,
          image: data.user.user_metadata?.avatar_url,
        },
        create: {
          supabaseId: data.user.id,
          email: data.user.email!,
          firstName: firstName,
          lastName: lastName,
          image: data.user.user_metadata?.avatar_url,
        },
      });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
