// lib/workflow-engine.ts
//
// Core engine for Phase 3: AI Workflows
//
// Responsibilities:
// 1. planWorkflowSteps()   — AI breaks natural language goal into structured steps
// 2. executeWorkflow()     — Runs steps sequentially, updating DB in real-time
// 3. synthesizeReport()    — AI generates structured report from results
//
// Step types: search | extract | analyze | aggregate | generate_report

import { prisma } from "@/lib/prisma";
import {
  buildPlanningPrompt,
  buildSynthesisPrompt,
} from "@/lib/workflow-prompts";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface WorkflowStep {
  index: number;
  type: "search" | "extract" | "analyze" | "aggregate" | "generate_report";
  title: string;
  description: string;
  params: Record<string, any>;
  dependsOn: number[]; // indices of steps this depends on
}

interface PlanInput {
  goal: string;
  sources: string[];
  depth: string;
  outputFormat: string;
}

interface PlanOutput {
  title: string;
  description: string;
  steps: WorkflowStep[];
}

interface SynthesizeInput {
  goal: string;
  results: any[];
  outputFormat: string;
  customTitle?: string;
}

interface ReportOutput {
  title: string;
  summary: string;
  sections: Array<{
    id: string;
    type: "text" | "table" | "chart" | "list";
    title: string;
    content: any;
  }>;
}

// ─────────────────────────────────────────────────────────
// AI Helper — Calls Claude API directly via fetch
// ─────────────────────────────────────────────────────────

async function callAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback: If no Anthropic key, try OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      return callOpenAI(systemPrompt, userPrompt, openaiKey);
    }
    throw new Error(
      "No AI API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY"
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const text = data.content
    ?.filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("\n");

  return text || "";
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/** Parse JSON from AI response, stripping markdown fences */
function parseAIJson<T>(text: string): T {
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────────────────
// 1. WORKFLOW PLANNER — AI breaks goal into steps
// ─────────────────────────────────────────────────────────

export async function planWorkflowSteps(input: PlanInput): Promise<PlanOutput> {
  const { goal, sources, depth, outputFormat } = input;

  const depthConfig = {
    quick: { maxResults: 5, maxSteps: 3 },
    standard: { maxResults: 10, maxSteps: 5 },
    deep: { maxResults: 20, maxSteps: 8 },
  }[depth] || { maxResults: 10, maxSteps: 5 };

  // Use enhanced prompts from workflow-prompts.ts
  const { system: systemPrompt, user: userPrompt } = buildPlanningPrompt({
    goal,
    sources,
    depth,
    outputFormat,
    maxResults: depthConfig.maxResults,
    maxSteps: depthConfig.maxSteps,
  });

  const response = await callAI(systemPrompt, userPrompt);
  const plan = parseAIJson<PlanOutput>(response);

  // Validate plan
  if (!plan.steps || !Array.isArray(plan.steps) || plan.steps.length === 0) {
    throw new Error("AI returned invalid workflow plan: no steps");
  }

  // Ensure last step is generate_report
  const lastStep = plan.steps[plan.steps.length - 1];
  if (lastStep.type !== "generate_report") {
    plan.steps.push({
      index: plan.steps.length,
      type: "generate_report",
      title: "Generate final report",
      description: `Create a ${outputFormat} report from all collected data`,
      params: { reportFormat: outputFormat },
      dependsOn: plan.steps.map((_, i) => i),
    });
  }

  // Normalize indices
  plan.steps = plan.steps.map((step, i) => ({ ...step, index: i }));

  return plan;
}

// ─────────────────────────────────────────────────────────
// 2. WORKFLOW EXECUTOR — Runs steps sequentially
// ─────────────────────────────────────────────────────────

export async function executeWorkflow(
  workflowId: string,
  startFromStep: number = 0
): Promise<void> {
  // Mark workflow as running
  await prisma.workflow.update({
    where: { id: workflowId },
    data: { status: "running" },
  });

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

  const steps = workflow.steps as unknown as WorkflowStep[];
  const results = ((workflow.results as unknown as any[]) || []) as any[];

  for (let i = startFromStep; i < steps.length; i++) {
    const step = steps[i];

    // Check if workflow was cancelled mid-execution
    const currentWorkflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      select: { status: true },
    });
    if (currentWorkflow?.status === "failed") {
      console.log(
        `⏹️ Workflow ${workflowId} was cancelled, stopping at step ${i}`
      );
      return;
    }

    // Update current step pointer
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { currentStep: i },
    });

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        stepIndex: i,
        stepType: step.type,
        stepTitle: step.title,
        input: step.params || {},
        status: "running",
      },
    });

    const startTime = Date.now();

    try {
      console.log(`🔄 Executing step ${i + 1}/${steps.length}: ${step.title}`);

      // Execute the step based on type
      const stepResult = await executeStep(step, results, workflow);

      const durationMs = Date.now() - startTime;

      // Save step result
      results[i] = { stepIndex: i, data: stepResult };

      // Update execution record
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: "completed",
          output: stepResult,
          durationMs,
          completedAt: new Date(),
        },
      });

      // Update workflow results
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          results: results,
          currentStep: i + 1,
        },
      });

      console.log(`✅ Step ${i + 1} completed in ${durationMs}ms`);
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      console.error(`❌ Step ${i + 1} failed:`, error.message);

      // Mark execution as failed
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: "failed",
          error: error.message,
          durationMs,
        },
      });

      // Mark workflow as failed
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          status: "failed",
          errorMessage: `Step ${i + 1} failed: ${error.message}`,
          failedStep: i,
          results: results,
        },
      });

      return; // Stop execution on failure
    }
  }

  // All steps completed — mark workflow as completed
  await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      status: "completed",
      completedAt: new Date(),
      currentStep: steps.length,
    },
  });

  console.log(`🎉 Workflow ${workflowId} completed successfully!`);

  // Auto-generate report
  try {
    await autoGenerateReport(workflowId);
  } catch (error: any) {
    console.error("⚠️ Auto-report generation failed:", error.message);
    // Don't fail the workflow for report generation failure
  }
}

// ─────────────────────────────────────────────────────────
// STEP EXECUTOR — Routes to the right handler
// ─────────────────────────────────────────────────────────

async function executeStep(
  step: WorkflowStep,
  previousResults: any[],
  workflow: any
): Promise<any> {
  switch (step.type) {
    case "search":
      return executeSearchStep(step, workflow);
    case "extract":
      return executeExtractStep(step, previousResults);
    case "analyze":
      return executeAnalyzeStep(step, previousResults);
    case "aggregate":
      return executeAggregateStep(step, previousResults);
    case "generate_report":
      return executeGenerateReportStep(step, previousResults, workflow);
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

// ─────────────────────────────────────────────────────────
// STEP HANDLERS
// ─────────────────────────────────────────────────────────

/**
 * SEARCH STEP — Calls internal search APIs
 * Supports: google (web), github, pexels
 */
async function executeSearchStep(
  step: WorkflowStep,
  workflow: any
): Promise<any> {
  const { source = "google", query, num = 10 } = step.params;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  let endpoint: string;
  let body: any;

  switch (source) {
    case "google":
    case "web":
      endpoint = `${baseUrl}/api/search/web`;
      body = {
        query,
        filters: { num },
      };
      break;

    case "github":
      endpoint = `${baseUrl}/api/search/github`;
      body = {
        query,
        sort: step.params.sort || "stars",
        language: step.params.language,
        stars: step.params.stars,
      };
      break;

    case "pexels":
      endpoint = `${baseUrl}/api/search/pexels`;
      body = {
        query,
        perPage: num,
      };
      break;

    default:
      throw new Error(`Unknown search source: ${source}`);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Search API failed (${source}): ${response.status} — ${errText}`
    );
  }

  const data = await response.json();

  // Normalize response format across sources
  return {
    source,
    query,
    results: data.results || data.repos || data.photos || [],
    totalResults: (data.results || data.repos || data.photos || []).length,
  };
}

/**
 * EXTRACT STEP — AI extracts specific data points from previous results
 */
async function executeExtractStep(
  step: WorkflowStep,
  previousResults: any[]
): Promise<any> {
  const { extractionGoal, fields = [], fromStep = 0 } = step.params;

  const sourceData = previousResults[fromStep]?.data;
  if (!sourceData) {
    throw new Error(`No data from step ${fromStep} to extract from`);
  }

  const systemPrompt = `You are a data extraction assistant. Extract specific information from search results.
Respond with ONLY valid JSON, no markdown fences.`;

  const userPrompt = `Extract the following from these search results:

EXTRACTION GOAL: ${extractionGoal}
FIELDS TO EXTRACT: ${JSON.stringify(fields)}

SOURCE DATA:
${JSON.stringify(sourceData, null, 2).slice(0, 8000)}

Return JSON in this format:
{
  "extracted": [
    { ${fields.map((f: string) => `"${f}": "value"`).join(", ")} }
  ],
  "totalExtracted": <number>,
  "summary": "Brief summary of what was extracted"
}`;

  const response = await callAI(systemPrompt, userPrompt);
  return parseAIJson(response);
}

/**
 * ANALYZE STEP — AI analyzes collected data
 */
async function executeAnalyzeStep(
  step: WorkflowStep,
  previousResults: any[]
): Promise<any> {
  const { analysisType = "general", question, fromSteps = [] } = step.params;

  // Collect data from referenced steps
  const dataToAnalyze =
    fromSteps.length > 0
      ? fromSteps
          .map((idx: number) => previousResults[idx]?.data)
          .filter(Boolean)
      : previousResults.filter(Boolean).map((r) => r.data);

  if (dataToAnalyze.length === 0) {
    throw new Error("No data available for analysis");
  }

  const systemPrompt = `You are a research analyst. Analyze the provided data and give insights.
Analysis type: ${analysisType}
Respond with ONLY valid JSON, no markdown fences.`;

  const userPrompt = `Analyze this data:

QUESTION: ${question || "Provide a comprehensive analysis"}
ANALYSIS TYPE: ${analysisType}

DATA:
${JSON.stringify(dataToAnalyze, null, 2).slice(0, 10000)}

Return JSON in this format:
{
  "analysisType": "${analysisType}",
  "findings": [
    { "insight": "Key finding", "evidence": "Supporting data", "confidence": "high|medium|low" }
  ],
  "summary": "Overall analysis summary",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

  const response = await callAI(systemPrompt, userPrompt);
  return parseAIJson(response);
}

/**
 * AGGREGATE STEP — Combines data from multiple steps
 */
async function executeAggregateStep(
  step: WorkflowStep,
  previousResults: any[]
): Promise<any> {
  const { fromSteps = [], mergeStrategy = "combine" } = step.params;

  const dataToMerge =
    fromSteps.length > 0
      ? fromSteps
          .map((idx: number) => ({
            stepIndex: idx,
            data: previousResults[idx]?.data,
          }))
          .filter((d: { stepIndex: number; data: any }) => d.data)
      : previousResults
          .filter(Boolean)
          .map((r, idx) => ({ stepIndex: idx, data: r.data }));

  if (dataToMerge.length === 0) {
    throw new Error("No data available for aggregation");
  }

  // For simple merges, do it programmatically
  if (mergeStrategy === "combine") {
    const allResults: any[] = [];
    for (const source of dataToMerge) {
      if (source.data?.results) {
        allResults.push(...source.data.results);
      } else if (source.data?.extracted) {
        allResults.push(...source.data.extracted);
      } else if (source.data?.findings) {
        allResults.push(...source.data.findings);
      } else {
        allResults.push(source.data);
      }
    }

    return {
      mergeStrategy,
      totalItems: allResults.length,
      sourcesUsed: dataToMerge.length,
      aggregatedData: allResults,
    };
  }

  // For complex merges, use AI
  const systemPrompt = `You are a data aggregation assistant. Merge and organize data from multiple sources.
Respond with ONLY valid JSON, no markdown fences.`;

  const userPrompt = `Merge this data using strategy: ${mergeStrategy}

DATA SOURCES:
${JSON.stringify(dataToMerge, null, 2).slice(0, 10000)}

Return JSON in this format:
{
  "mergeStrategy": "${mergeStrategy}",
  "totalItems": <number>,
  "aggregatedData": [ ... merged items ... ],
  "summary": "Brief description of merged data"
}`;

  const response = await callAI(systemPrompt, userPrompt);
  return parseAIJson(response);
}

/**
 * GENERATE_REPORT STEP — Creates a structured report from all workflow data
 * This is the final step; report is also saved separately via autoGenerateReport()
 */
async function executeGenerateReportStep(
  step: WorkflowStep,
  previousResults: any[],
  workflow: any
): Promise<any> {
  const reportFormat =
    step.params.reportFormat || workflow.outputFormat || "summary";

  // Collect all data from previous steps
  const allData = previousResults.filter(Boolean).map((r) => r.data);

  return {
    readyForReport: true,
    reportFormat,
    dataCollected: allData.length,
    summary: `All ${allData.length} steps completed. Report generation ready.`,
  };
}

// ─────────────────────────────────────────────────────────
// AUTO REPORT GENERATION — Called after workflow completes
// ─────────────────────────────────────────────────────────

async function autoGenerateReport(workflowId: string): Promise<void> {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow || workflow.status !== "completed") return;

  const reportData = await synthesizeReport({
    goal: workflow.query,
    results: workflow.results as any[],
    outputFormat: workflow.outputFormat,
  });

  await prisma.report.create({
    data: {
      userId: workflow.userId,
      title: reportData.title,
      summary: reportData.summary,
      sections: reportData.sections,
      format: workflow.outputFormat,
      sourceData: {
        workflowId: workflow.id,
        workflowQuery: workflow.query,
        sources: workflow.sources.map((s) => ({ type: s })),
      },
      workflowId: workflow.id,
    },
  });

  console.log(`📄 Report auto-generated for workflow ${workflowId}`);
}

// ─────────────────────────────────────────────────────────
// 3. REPORT SYNTHESIZER — AI generates structured report
// ─────────────────────────────────────────────────────────

export async function synthesizeReport(
  input: SynthesizeInput
): Promise<ReportOutput> {
  const { goal, results, outputFormat, customTitle } = input;

  // Use enhanced prompts from workflow-prompts.ts
  const { system: systemPrompt, user: userPrompt } = buildSynthesisPrompt({
    goal,
    results,
    outputFormat,
    customTitle,
  });

  const response = await callAI(systemPrompt, userPrompt);
  const report = parseAIJson<ReportOutput>(response);

  // Validate report structure
  if (!report.title || !report.summary || !report.sections) {
    throw new Error("AI returned invalid report structure");
  }

  // Ensure sections have IDs
  report.sections = report.sections.map((section, i) => ({
    ...section,
    id: section.id || `section-${i + 1}`,
  }));

  return report;
}
