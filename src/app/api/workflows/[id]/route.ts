// app/api/workflows/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helpers";

// DELETE /api/workflows/[id] — Delete a workflow and all its executions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (workflow.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete workflow (cascades to WorkflowExecution records)
    await prisma.workflow.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Workflow deleted" });
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
