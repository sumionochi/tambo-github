// lib/workflow-prompts.ts
//
// Steps 15-16: Enhanced AI prompts for better workflow planning and report synthesis.
// These replace the inline prompts in workflow-engine.ts with higher-quality,
// few-shot prompted versions that produce more reliable JSON output.
//
// Usage: Import these into workflow-engine.ts to replace the systemPrompt/userPrompt strings.

// ─────────────────────────────────────────────────────────
// STEP 15: Enhanced Workflow Planning Prompt
// ─────────────────────────────────────────────────────────

interface PlanPromptInput {
  goal: string;
  sources: string[];
  depth: string;
  outputFormat: string;
  maxResults: number;
  maxSteps: number;
}

export function buildPlanningPrompt(input: PlanPromptInput): {
  system: string;
  user: string;
} {
  const { goal, sources, depth, outputFormat, maxResults, maxSteps } = input;

  const system = `You are an expert research workflow planner for FlowSearch AI.
  Break down research goals into precise, executable step chains.
  
  # STEP TYPES
  
  1. "search" — Query a search source
     params: { source: "google"|"github"|"pexels", query: string, num?: number }
     Rules:
     - Craft SPECIFIC search queries, NOT the raw user goal
     - Use different queries per search step to maximize coverage
     - "google" for articles, docs, reviews; "github" for repos, code; "pexels" for images
     - Set num based on depth (quick=${
       depth === "quick" ? 5 : depth === "deep" ? 20 : 10
     })
  
  2. "extract" — Parse specific data from a previous step's results
     params: { extractionGoal: string, fields: string[], fromStep: number }
     Rules:
     - extractionGoal must be detailed and specific
     - fields array defines exact output schema
     - fromStep references the step index with source data
  
  3. "analyze" — AI-powered analysis of collected data
     params: { analysisType: string, question: string, fromSteps: number[] }
     Rules:
     - analysisType: "comparison", "sentiment", "trend", "general", "strengths_weaknesses"
     - question must be specific and answerable from the data
     - fromSteps references ALL steps needed for this analysis
  
  4. "aggregate" — Combine data from multiple steps
     params: { fromSteps: number[], mergeStrategy: "combine"|"deduplicate"|"rank" }
     Rules:
     - Use when 2+ search/extract steps produce data that needs merging
     - "combine" = simple merge, "deduplicate" = remove duplicates, "rank" = AI-ranked
  
  5. "generate_report" — ALWAYS the final step
     params: { reportFormat: "${outputFormat}" }
     dependsOn: [all previous step indices]
  
  # CONSTRAINTS
  - Available sources: ${JSON.stringify(sources)}
  - Maximum steps: ${maxSteps}
  - Maximum results per search: ${maxResults}
  - Output format: ${outputFormat}
  - ALWAYS end with "generate_report"
  - Each search query must be DIFFERENT and targeted
  - dependsOn must be logically correct (can't depend on future steps)
  
  # OUTPUT FORMAT
  Respond with ONLY valid JSON. No markdown, no explanation, no backticks.
  
  # EXAMPLES
  
  Goal: "Compare React, Vue, and Angular"
  {
    "title": "React vs Vue vs Angular",
    "description": "Comparison of top frontend frameworks by features, performance, and ecosystem",
    "steps": [
      {"index":0,"type":"search","title":"Search web for framework comparison","description":"Find recent articles comparing React, Vue, Angular","params":{"source":"google","query":"React vs Vue vs Angular comparison 2025 features performance","num":10},"dependsOn":[]},
      {"index":1,"type":"search","title":"Check GitHub stars and activity","description":"Find GitHub repos for each framework","params":{"source":"github","query":"react vue angular framework","sort":"stars","num":10},"dependsOn":[]},
      {"index":2,"type":"extract","title":"Extract framework metrics","description":"Pull key comparison points from results","params":{"extractionGoal":"Extract framework name, stars, features, learning curve, performance benchmarks, ecosystem size, job market demand","fields":["name","stars","features","learningCurve","performance","ecosystem","jobs"],"fromStep":0},"dependsOn":[0,1]},
      {"index":3,"type":"analyze","title":"Compare frameworks head-to-head","description":"Rank frameworks across multiple dimensions","params":{"analysisType":"comparison","question":"Compare React, Vue, and Angular across performance, DX, ecosystem, learning curve, and job market. Which is best for each use case?","fromSteps":[1,2]},"dependsOn":[2]},
      {"index":4,"type":"generate_report","title":"Generate comparison report","description":"Create detailed comparison report","params":{"reportFormat":"comparison"},"dependsOn":[0,1,2,3]}
    ]
  }
  
  Goal: "Research AI trends in healthcare"
  {
    "title": "AI in Healthcare Trends",
    "description": "Analysis of AI applications and trends in the healthcare industry",
    "steps": [
      {"index":0,"type":"search","title":"Search for AI healthcare trends","description":"Find articles on latest AI healthcare applications","params":{"source":"google","query":"AI healthcare trends applications 2025","num":10},"dependsOn":[]},
      {"index":1,"type":"search","title":"Find specific AI healthcare startups","description":"Search for notable companies and funding","params":{"source":"google","query":"AI healthcare startups funding Series A B 2024 2025","num":10},"dependsOn":[]},
      {"index":2,"type":"extract","title":"Extract key trends and companies","description":"Pull out trend names, companies, funding amounts, and use cases","params":{"extractionGoal":"Extract AI healthcare trend names, company names, funding amounts, use cases, regulatory status","fields":["trend","company","funding","useCase","regulatoryStatus"],"fromStep":0},"dependsOn":[0,1]},
      {"index":3,"type":"analyze","title":"Analyze healthcare AI landscape","description":"Identify patterns, leaders, and opportunities","params":{"analysisType":"trend","question":"What are the dominant AI healthcare trends? Which companies are leading? Where are the biggest opportunities and risks?","fromSteps":[0,1,2]},"dependsOn":[2]},
      {"index":4,"type":"generate_report","title":"Generate analysis report","description":"Create comprehensive healthcare AI analysis","params":{"reportFormat":"analysis"},"dependsOn":[0,1,2,3]}
    ]
  }`;

  const user = `Research goal: "${goal}"
  
  Generate a workflow with up to ${maxSteps} steps using sources: ${JSON.stringify(
    sources
  )}.
  Output format: ${outputFormat}. Depth: ${depth} (${maxResults} results per search).
  
  Return ONLY the JSON object with title, description, and steps array.`;

  return { system, user };
}

// ─────────────────────────────────────────────────────────
// STEP 16: Enhanced Report Synthesis Prompts
// ─────────────────────────────────────────────────────────

interface ReportPromptInput {
  goal: string;
  results: any[];
  outputFormat: string;
  customTitle?: string;
}

export function buildSynthesisPrompt(input: ReportPromptInput): {
  system: string;
  user: string;
} {
  const { goal, results, outputFormat, customTitle } = input;

  // Truncate data intelligently — keep structure but limit size
  const truncatedResults = JSON.stringify(results, null, 2);
  const maxDataLen = 14000;
  const dataStr =
    truncatedResults.length > maxDataLen
      ? truncatedResults.slice(0, maxDataLen) + "\n... [truncated]"
      : truncatedResults;

  const formatGuide =
    formatInstructions[outputFormat] || formatInstructions.summary;

  const system = `You are a professional research report generator for FlowSearch AI.
  Create well-structured, data-driven research reports from collected workflow data.
  
  # SECTION TYPES (use these exact values for "type")
  
  ## "text" — Paragraph content
  content: string (plain text or markdown-like formatting)
  Use for: Executive overviews, analysis paragraphs, conclusions, recommendations
  
  ## "table" — Structured data tables
  content: { "headers": string[], "rows": string[][] }
  Use for: Comparisons, metrics, feature matrices, pricing tables
  Rules: All rows must have the same length as headers. Use real data from results.
  
  ## "chart" — Visual data charts
  content: { "chartType": "bar"|"line"|"pie", "labels": string[], "datasets": [{ "label": string, "data": number[] }] }
  Use for: Quantitative comparisons, trends over time, distribution breakdowns
  Rules: data arrays must match labels length. Use real numbers from results, not fabricated ones.
  
  ## "list" — Organized bullet lists
  content: { "items": string[] }
  Use for: Key takeaways, recommendations, pros/cons, action items
  
  # RULES
  1. Every section needs: id (unique, like "section-1"), type, title, content
  2. Use REAL data from the collected results — don't invent numbers or names
  3. If data is sparse, note limitations honestly in a text section
  4. Include 3-6 sections per report (appropriate to format)
  5. Keep executive summary to 2-3 sentences
  6. Table headers should be concise and clear
  7. Chart data must be numeric and from the results
  8. Section IDs should be sequential: "section-1", "section-2", etc.
  9. Respond with ONLY valid JSON — no markdown fences, no explanation
  10. If results contain URLs or source names, reference them naturally in text
  
  # REPORT FORMAT: ${outputFormat}
  ${formatGuide}
  
  # EXAMPLE OUTPUT STRUCTURE
  {
    "title": "Report Title Here",
    "summary": "Concise 2-3 sentence executive summary based on data.",
    "sections": [
      {
        "id": "section-1",
        "type": "text",
        "title": "Overview",
        "content": "Analysis overview paragraph with key findings from the data..."
      },
      {
        "id": "section-2",
        "type": "table",
        "title": "Feature Comparison",
        "content": {
          "headers": ["Name", "Stars", "Size", "Key Feature"],
          "rows": [
            ["React", "220k", "Large", "Virtual DOM"],
            ["Vue", "210k", "Medium", "Reactivity system"]
          ]
        }
      },
      {
        "id": "section-3",
        "type": "chart",
        "title": "Popularity Metrics",
        "content": {
          "chartType": "bar",
          "labels": ["React", "Vue", "Angular"],
          "datasets": [{"label": "GitHub Stars (k)", "data": [220, 210, 95]}]
        }
      },
      {
        "id": "section-4",
        "type": "list",
        "title": "Key Takeaways",
        "content": {
          "items": [
            "React leads in ecosystem size and job market",
            "Vue offers the smoothest learning curve",
            "Angular is strongest for enterprise applications"
          ]
        }
      }
    ]
  }`;

  const user = `Generate a ${outputFormat} report for this research:
  
  RESEARCH GOAL: ${goal}
  ${
    customTitle
      ? `TITLE: ${customTitle}`
      : "Generate an appropriate title from the goal."
  }
  
  COLLECTED DATA:
  ${dataStr}
  
  Return ONLY the JSON object with title, summary, and sections array.`;

  return { system, user };
}

// ─────────────────────────────────────────────────────────
// Format-specific instructions
// ─────────────────────────────────────────────────────────

const formatInstructions: Record<string, string> = {
  comparison: `Create a COMPARISON report with these sections:
  1. text: Executive overview comparing the items
  2. table: Detailed comparison matrix with features/metrics as columns
  3. chart: Bar chart showing key quantitative differences (stars, downloads, etc.)
  4. list: Key differences and when to use each option
  5. text: Final recommendation with reasoning`,

  analysis: `Create an ANALYSIS report with these sections:
  1. text: Executive overview of the analysis findings
  2. text: Detailed analysis of the main trends/patterns found
  3. table: Supporting data table with key metrics
  4. list: Key insights and takeaways (5-8 items)
  5. text: Conclusions, recommendations, and next steps`,

  timeline: `Create a TIMELINE report with these sections:
  1. text: Executive overview of the subject's evolution
  2. table: Chronological events table with Date, Event, and Significance columns
  3. list: Major milestones and turning points
  4. text: Current state and recent developments
  5. text: Future predictions and emerging trends`,

  summary: `Create a SUMMARY report with these sections:
  1. text: Executive summary (2-3 sentences capturing the most important finding)
  2. text: Detailed overview of main findings
  3. table: Key data points organized in a table (if applicable)
  4. list: Top highlights and takeaways (5-7 items)
  5. text: Conclusion with optional next steps`,
};
