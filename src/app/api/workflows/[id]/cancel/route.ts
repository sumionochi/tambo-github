// app/api/workflows/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helpers";

// POST /api/workflows/[id]/cancel — Cancel a running workflow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: { userId: true, status: true, currentStep: true },
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

    if (workflow.status !== "running" && workflow.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot cancel workflow with status: ${workflow.status}` },
        { status: 400 }
      );
    }

    // Mark workflow as failed with cancellation reason
    await prisma.workflow.update({
      where: { id },
      data: {
        status: "failed",
        errorMessage: "Cancelled by user",
        failedStep: workflow.currentStep,
      },
    });

    // Mark any pending/running executions as failed
    await prisma.workflowExecution.updateMany({
      where: {
        workflowId: id,
        status: { in: ["pending", "running"] },
      },
      data: {
        status: "failed",
        error: "Cancelled by user",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Workflow cancelled",
    });
  } catch (error) {
    console.error("Failed to cancel workflow:", error);
    return NextResponse.json(
      { error: "Failed to cancel workflow" },
      { status: 500 }
    );
  }
}
