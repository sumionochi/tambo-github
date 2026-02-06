// app/api/workflows/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helpers";

// GET /api/workflows — List all workflows for the user
export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflows = await prisma.workflow.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        query: true,
        status: true,
        currentStep: true,
        totalSteps: true,
        sources: true,
        depth: true,
        outputFormat: true,
        errorMessage: true,
        failedStep: true,
        createdAt: true,
        completedAt: true,
        report: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("Failed to fetch workflows:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}
