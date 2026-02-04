// lib/utils/sync-user.ts
import { prisma } from "@/lib/prisma";
import type { User } from "@supabase/supabase-js";

export async function ensureUserExists(supabaseUser: User) {
  try {
    // Check if user exists in Prisma
    const existingUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (existingUser) {
      return existingUser;
    }

    // Create user if doesn't exist
    const newUser = await prisma.user.create({
      data: {
        id: supabaseUser.id, // Use Supabase ID as Prisma ID
        supabaseId: supabaseUser.id,
        email: supabaseUser.email!,
        firstName: supabaseUser.user_metadata?.first_name || null,
        lastName: supabaseUser.user_metadata?.last_name || null,
        image: supabaseUser.user_metadata?.avatar_url || null,
      },
    });

    console.log("✅ Created new user in Prisma:", newUser.id);
    return newUser;
  } catch (error) {
    console.error("Error syncing user:", error);
    throw error;
  }
}
