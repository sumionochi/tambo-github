// app/api/workflows/execute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { planWorkflowSteps } from "@/lib/workflow-engine";

// POST /api/workflows/execute — Create and start a workflow
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      goal,
      sources = ["google"],
      depth = "standard",
      outputFormat = "summary",
    } = body;

    if (!goal || typeof goal !== "string") {
      return NextResponse.json(
        { error: "Missing required field: goal" },
        { status: 400 }
      );
    }

    // Step 1: Use AI to plan the workflow steps from natural language goal
    const { title, description, steps } = await planWorkflowSteps({
      goal,
      sources,
      depth,
      outputFormat,
    });

    // Step 2: Create the workflow record in database
    const workflow = await prisma.workflow.create({
      data: {
        userId: user.id,
        title,
        description,
        query: goal,
        status: "pending",
        currentStep: 0,
        totalSteps: steps.length,
        steps: JSON.parse(JSON.stringify(steps)),
        results: JSON.parse(JSON.stringify([])),
        sources,
        depth,
        outputFormat,
      },
    });

    // Step 3: Start execution asynchronously (fire-and-forget)
    // The executeWorkflow function runs in the background
    // and updates the DB as it progresses.
    // We import dynamically to avoid circular dependencies.
    const { executeWorkflow } = await import("@/lib/workflow-engine");

    // Fire and forget — don't await this
    executeWorkflow(workflow.id).catch((err) => {
      console.error(`Workflow ${workflow.id} execution error:`, err);
    });

    // Step 4: Return workflow info immediately so frontend can start polling
    return NextResponse.json({
      success: true,
      workflowId: workflow.id,
      title: workflow.title,
      status: "pending",
      totalSteps: steps.length,
      steps: steps.map((s: any) => ({
        index: s.index,
        type: s.type,
        title: s.title,
        description: s.description,
        status: "pending",
      })),
      message: `Workflow created with ${steps.length} steps. Execution starting...`,
    });
  } catch (error: any) {
    console.error("Failed to create workflow:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create workflow" },
      { status: 500 }
    );
  }
}
