// app/api/reports/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helpers";

// GET /api/reports — List all reports for the user
export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reports = await prisma.report.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        summary: true,
        format: true,
        sourceCollectionId: true,
        workflowId: true,
        createdAt: true,
        updatedAt: true,
        // Include section count for UI display
        sections: true,
      },
    });

    // Map to add sectionCount without sending full section data in list view
    const reportsList = reports.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      format: r.format,
      sourceCollectionId: r.sourceCollectionId,
      workflowId: r.workflowId,
      sectionCount: Array.isArray(r.sections)
        ? (r.sections as any[]).length
        : 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({ reports: reportsList });
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
