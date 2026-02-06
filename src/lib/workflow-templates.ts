// lib/workflow-templates.ts
//
// Pre-built workflow templates for common research patterns.
// These skip AI planning entirely, producing instant step definitions.
// Pattern matching detects which template fits the user's goal.

import type { WorkflowStep } from "@/lib/workflow-engine";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  /** Regex patterns that trigger this template */
  patterns: RegExp[];
  /** Keywords that boost match confidence */
  keywords: string[];
  /** Default sources for this template */
  defaultSources: string[];
  /** Default output format */
  defaultFormat: string;
  /** Generate steps, injecting the extracted topic */
  buildSteps: (topic: string, depth: string) => WorkflowStep[];
  /** Generate title from topic */
  buildTitle: (topic: string) => string;
}

interface TemplateMatch {
  template: WorkflowTemplate;
  topic: string;
  confidence: number;
}

// ─────────────────────────────────────────────────────────
// Depth configs
// ─────────────────────────────────────────────────────────

const depthResults: Record<string, number> = {
  quick: 5,
  standard: 10,
  deep: 20,
};

// ─────────────────────────────────────────────────────────
// Template: Tech Comparison
// ─────────────────────────────────────────────────────────

const techComparisonTemplate: WorkflowTemplate = {
  id: "tech-comparison",
  name: "Tech Comparison",
  description:
    "Compare technologies by GitHub stats, features, and community activity",
  patterns: [
    /compare\s+(?:the\s+)?(?:top\s+\d+\s+)?(.+?)(?:\s+(?:frameworks?|libraries?|tools?|packages?|solutions?))?$/i,
    /(.+?)\s+vs\.?\s+(.+)/i,
    /(?:what|which)\s+(?:are|is)\s+(?:the\s+)?(?:best|top)\s+(.+?)(?:\s+(?:frameworks?|libraries?|tools?|packages?))?$/i,
    /comparison\s+(?:of|between)\s+(.+)/i,
  ],
  keywords: [
    "compare",
    "vs",
    "versus",
    "comparison",
    "best",
    "top",
    "alternative",
    "framework",
    "library",
    "tool",
  ],
  defaultSources: ["google", "github"],
  defaultFormat: "comparison",
  buildTitle: (topic) => `${topic} Comparison`,
  buildSteps: (topic, depth) => {
    const num = depthResults[depth] || 10;
    return [
      {
        index: 0,
        type: "search",
        title: `Search web for ${topic}`,
        description: `Find articles and reviews comparing ${topic}`,
        params: {
          source: "google",
          query: `best ${topic} comparison ${new Date().getFullYear()}`,
          num,
        },
        dependsOn: [],
      },
      {
        index: 1,
        type: "search",
        title: `Search GitHub for ${topic}`,
        description: `Find popular repositories related to ${topic}`,
        params: { source: "github", query: topic, sort: "stars", num },
        dependsOn: [],
      },
      {
        index: 2,
        type: "extract",
        title: "Extract key features & metrics",
        description:
          "Pull out names, stars, features, pros/cons from search results",
        params: {
          extractionGoal: `Extract comparison data for ${topic}: name, description, key features, pros, cons, popularity metrics`,
          fields: [
            "name",
            "description",
            "features",
            "pros",
            "cons",
            "stars",
            "popularity",
          ],
          fromStep: 0,
        },
        dependsOn: [0, 1],
      },
      {
        index: 3,
        type: "analyze",
        title: "Compare and rank options",
        description: `Analyze and rank ${topic} based on features, popularity, and community health`,
        params: {
          analysisType: "comparison",
          question: `Compare these ${topic} options. Which is best for different use cases? Rank them by popularity, features, and developer experience.`,
          fromSteps: [1, 2],
        },
        dependsOn: [2],
      },
      {
        index: 4,
        type: "generate_report",
        title: "Generate comparison report",
        description: `Create a detailed comparison report for ${topic}`,
        params: { reportFormat: "comparison" },
        dependsOn: [3],
      },
    ];
  },
};

// ─────────────────────────────────────────────────────────
// Template: Market Research
// ─────────────────────────────────────────────────────────

const marketResearchTemplate: WorkflowTemplate = {
  id: "market-research",
  name: "Market Research",
  description: "Research products, competitors, pricing, and market trends",
  patterns: [
    /(?:research|analyze|study)\s+(?:the\s+)?(?:market\s+(?:for|of)\s+)?(.+?)(?:\s+market)?$/i,
    /market\s+(?:research|analysis)\s+(?:for|on|about)\s+(.+)/i,
    /(?:find|explore|investigate)\s+(?:competitors?|alternatives?)\s+(?:for|to|of)\s+(.+)/i,
    /(?:industry|market|competitive)\s+analysis\s+(?:for|of|on)\s+(.+)/i,
  ],
  keywords: [
    "market",
    "research",
    "competitor",
    "industry",
    "pricing",
    "trend",
    "landscape",
  ],
  defaultSources: ["google"],
  defaultFormat: "analysis",
  buildTitle: (topic) => `${topic} Market Research`,
  buildSteps: (topic, depth) => {
    const num = depthResults[depth] || 10;
    return [
      {
        index: 0,
        type: "search",
        title: `Research ${topic} market landscape`,
        description: `Search for market overview, key players, and trends in ${topic}`,
        params: {
          source: "google",
          query: `${topic} market landscape trends ${new Date().getFullYear()}`,
          num,
        },
        dependsOn: [],
      },
      {
        index: 1,
        type: "search",
        title: `Find ${topic} competitors & pricing`,
        description: `Search for competitor analysis and pricing information`,
        params: {
          source: "google",
          query: `${topic} competitors pricing comparison review`,
          num,
        },
        dependsOn: [],
      },
      {
        index: 2,
        type: "extract",
        title: "Extract market data",
        description: "Pull key players, pricing, market size, and growth data",
        params: {
          extractionGoal: `Extract market data for ${topic}: company names, products, pricing, market share, growth metrics, strengths, weaknesses`,
          fields: [
            "company",
            "product",
            "pricing",
            "marketShare",
            "strengths",
            "weaknesses",
          ],
          fromStep: 0,
        },
        dependsOn: [0, 1],
      },
      {
        index: 3,
        type: "analyze",
        title: "Analyze market position & trends",
        description: `Deep analysis of ${topic} market dynamics and competitive landscape`,
        params: {
          analysisType: "market_analysis",
          question: `Analyze the ${topic} market: Who are the key players? What are the trends? Where are the opportunities? What's the competitive landscape?`,
          fromSteps: [0, 1, 2],
        },
        dependsOn: [2],
      },
      {
        index: 4,
        type: "generate_report",
        title: "Generate market research report",
        description: `Create a comprehensive market analysis report for ${topic}`,
        params: { reportFormat: "analysis" },
        dependsOn: [3],
      },
    ];
  },
};

// ─────────────────────────────────────────────────────────
// Template: Visual/Image Research
// ─────────────────────────────────────────────────────────

const imageResearchTemplate: WorkflowTemplate = {
  id: "image-research",
  name: "Visual Research",
  description: "Find and organize images with context analysis",
  patterns: [
    /(?:find|search|get|collect)\s+(?:images?|photos?|pictures?|visuals?)\s+(?:of|for|about|related to)\s+(.+)/i,
    /(?:visual|image|photo)\s+research\s+(?:for|on|about)\s+(.+)/i,
    /(?:mood\s*board|inspiration|visual\s+reference)\s+(?:for|of|about)\s+(.+)/i,
  ],
  keywords: [
    "image",
    "photo",
    "visual",
    "picture",
    "moodboard",
    "inspiration",
    "reference",
  ],
  defaultSources: ["google", "pexels"],
  defaultFormat: "summary",
  buildTitle: (topic) => `${topic} Visual Research`,
  buildSteps: (topic, depth) => {
    const num = depthResults[depth] || 10;
    return [
      {
        index: 0,
        type: "search",
        title: `Search web for ${topic} context`,
        description: `Find articles and background on ${topic}`,
        params: {
          source: "google",
          query: `${topic} design trends visual style`,
          num: Math.min(num, 5),
        },
        dependsOn: [],
      },
      {
        index: 1,
        type: "search",
        title: `Find ${topic} images`,
        description: `Search Pexels for high-quality ${topic} images`,
        params: { source: "pexels", query: topic, num },
        dependsOn: [],
      },
      {
        index: 2,
        type: "analyze",
        title: "Analyze visual themes & styles",
        description: `Identify visual patterns, color palettes, and styles in ${topic} imagery`,
        params: {
          analysisType: "visual_analysis",
          question: `Analyze the visual themes and styles found in these ${topic} search results and images. What are the dominant colors, compositions, and design patterns?`,
          fromSteps: [0, 1],
        },
        dependsOn: [0, 1],
      },
      {
        index: 3,
        type: "generate_report",
        title: "Generate visual research summary",
        description: `Create a summary of ${topic} visual research findings`,
        params: { reportFormat: "summary" },
        dependsOn: [2],
      },
    ];
  },
};

// ─────────────────────────────────────────────────────────
// Template: GitHub/Open Source Deep Dive
// ─────────────────────────────────────────────────────────

const githubDeepDiveTemplate: WorkflowTemplate = {
  id: "github-deep-dive",
  name: "GitHub Deep Dive",
  description: "Analyze GitHub repos, activity, and open source ecosystem",
  patterns: [
    /(?:analyze|research|explore)\s+(?:github|repos?|repositories?)\s+(?:for|about|related to)\s+(.+)/i,
    /(?:open\s*source|github)\s+(?:ecosystem|landscape|projects?)\s+(?:for|in|about)\s+(.+)/i,
    /(?:trending|popular|active)\s+(?:github\s+)?repos?\s+(?:for|in|about)\s+(.+)/i,
  ],
  keywords: [
    "github",
    "repository",
    "open source",
    "repo",
    "trending",
    "stars",
  ],
  defaultSources: ["github", "google"],
  defaultFormat: "analysis",
  buildTitle: (topic) => `${topic} GitHub Analysis`,
  buildSteps: (topic, depth) => {
    const num = depthResults[depth] || 10;
    return [
      {
        index: 0,
        type: "search",
        title: `Find top ${topic} repositories`,
        description: `Search GitHub for most popular ${topic} repos by stars`,
        params: { source: "github", query: topic, sort: "stars", num },
        dependsOn: [],
      },
      {
        index: 1,
        type: "search",
        title: `Find recently updated ${topic} repos`,
        description: `Search GitHub for most recently active ${topic} projects`,
        params: {
          source: "github",
          query: topic,
          sort: "updated",
          num: Math.min(num, 5),
        },
        dependsOn: [],
      },
      {
        index: 2,
        type: "search",
        title: `Research ${topic} ecosystem context`,
        description: `Find articles about the ${topic} open source ecosystem`,
        params: {
          source: "google",
          query: `${topic} open source ecosystem best repos ${new Date().getFullYear()}`,
          num: 5,
        },
        dependsOn: [],
      },
      {
        index: 3,
        type: "aggregate",
        title: "Combine repository data",
        description: "Merge data from both GitHub searches",
        params: { fromSteps: [0, 1], mergeStrategy: "combine" },
        dependsOn: [0, 1],
      },
      {
        index: 4,
        type: "analyze",
        title: "Analyze repository health & trends",
        description: `Analyze ${topic} repos by stars, activity, community health, and momentum`,
        params: {
          analysisType: "repository_analysis",
          question: `Analyze these ${topic} GitHub repositories. Which have the most momentum? Which are most mature? What patterns exist in the ecosystem?`,
          fromSteps: [2, 3],
        },
        dependsOn: [2, 3],
      },
      {
        index: 5,
        type: "generate_report",
        title: "Generate ecosystem analysis report",
        description: `Create an analysis of the ${topic} open source ecosystem`,
        params: { reportFormat: "analysis" },
        dependsOn: [4],
      },
    ];
  },
};

// ─────────────────────────────────────────────────────────
// Template: Trend/Timeline Research
// ─────────────────────────────────────────────────────────

const trendTimelineTemplate: WorkflowTemplate = {
  id: "trend-timeline",
  name: "Trend & Timeline",
  description: "Research the evolution and timeline of a topic",
  patterns: [
    /(?:history|evolution|timeline)\s+(?:of|for)\s+(.+)/i,
    /(?:how\s+has|how\s+did)\s+(.+?)\s+(?:evolved?|changed?|developed?|grown?)/i,
    /(?:trend|trends)\s+(?:in|for|of)\s+(.+)/i,
    /(?:rise|growth|development)\s+(?:of|in)\s+(.+)/i,
  ],
  keywords: [
    "history",
    "evolution",
    "timeline",
    "trend",
    "rise",
    "growth",
    "development",
    "over time",
  ],
  defaultSources: ["google"],
  defaultFormat: "timeline",
  buildTitle: (topic) => `${topic} Timeline & Trends`,
  buildSteps: (topic, depth) => {
    const num = depthResults[depth] || 10;
    return [
      {
        index: 0,
        type: "search",
        title: `Research history of ${topic}`,
        description: `Find articles about the history and evolution of ${topic}`,
        params: {
          source: "google",
          query: `history evolution timeline of ${topic}`,
          num,
        },
        dependsOn: [],
      },
      {
        index: 1,
        type: "search",
        title: `Find recent ${topic} trends`,
        description: `Search for current trends and developments in ${topic}`,
        params: {
          source: "google",
          query: `${topic} trends ${new Date().getFullYear()} latest developments`,
          num,
        },
        dependsOn: [],
      },
      {
        index: 2,
        type: "extract",
        title: "Extract key events & milestones",
        description: `Pull out dates, events, and milestones from ${topic} history`,
        params: {
          extractionGoal: `Extract chronological events, milestones, and key dates from the history of ${topic}`,
          fields: ["date", "event", "significance", "impact"],
          fromStep: 0,
        },
        dependsOn: [0],
      },
      {
        index: 3,
        type: "analyze",
        title: "Analyze trends & future direction",
        description: `Analyze how ${topic} has evolved and where it's heading`,
        params: {
          analysisType: "trend_analysis",
          question: `Analyze the evolution of ${topic}. What are the major inflection points? What trends are emerging? Where is this heading?`,
          fromSteps: [1, 2],
        },
        dependsOn: [1, 2],
      },
      {
        index: 4,
        type: "generate_report",
        title: "Generate timeline report",
        description: `Create a timeline report tracing the evolution of ${topic}`,
        params: { reportFormat: "timeline" },
        dependsOn: [3],
      },
    ];
  },
};

// ─────────────────────────────────────────────────────────
// All Templates
// ─────────────────────────────────────────────────────────

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  techComparisonTemplate,
  marketResearchTemplate,
  imageResearchTemplate,
  githubDeepDiveTemplate,
  trendTimelineTemplate,
];

// ─────────────────────────────────────────────────────────
// Template Matcher
// ─────────────────────────────────────────────────────────

/**
 * Try to match user's goal to a pre-built template.
 * Returns the best match with extracted topic, or null if no good match.
 */
export function matchTemplate(goal: string): TemplateMatch | null {
  const normalizedGoal = goal.trim().toLowerCase();
  let bestMatch: TemplateMatch | null = null;

  for (const template of WORKFLOW_TEMPLATES) {
    let confidence = 0;
    let extractedTopic = "";

    // Check regex patterns (high confidence)
    for (const pattern of template.patterns) {
      const match = goal.match(pattern);
      if (match) {
        // Use the first capture group as topic, or combine groups for "vs" patterns
        extractedTopic = match[2]
          ? `${match[1].trim()} vs ${match[2].trim()}`
          : match[1]?.trim() || goal;
        confidence += 0.6;
        break;
      }
    }

    // Check keyword presence (additive confidence)
    const keywordHits = template.keywords.filter((kw) =>
      normalizedGoal.includes(kw.toLowerCase())
    );
    confidence += Math.min(keywordHits.length * 0.15, 0.4);

    // If no topic was extracted from regex, try to extract it
    if (!extractedTopic && confidence > 0) {
      // Remove common instruction words and use what remains
      extractedTopic = goal
        .replace(
          /^(please|can you|could you|i want to|i need to|help me)\s+/i,
          ""
        )
        .replace(
          /\b(compare|research|analyze|find|search|explore|create|generate|make)\b/gi,
          ""
        )
        .replace(/\b(report|analysis|comparison|summary|for me|about)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Only consider if we have a reasonable topic
    if (confidence > 0.3 && extractedTopic.length > 2) {
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          template,
          topic: extractedTopic,
          confidence,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Build workflow steps from a matched template.
 * Returns a PlanOutput-compatible object.
 */
export function buildFromTemplate(
  template: WorkflowTemplate,
  topic: string,
  depth: string,
  sources?: string[],
  outputFormat?: string
): {
  title: string;
  description: string;
  steps: WorkflowStep[];
  isTemplate: boolean;
  templateId: string;
} {
  const steps = template.buildSteps(topic, depth);

  // Override output format in generate_report step if custom format specified
  if (outputFormat && outputFormat !== template.defaultFormat) {
    const reportStep = steps.find((s) => s.type === "generate_report");
    if (reportStep) {
      reportStep.params.reportFormat = outputFormat;
    }
  }

  // Filter steps to only use available sources
  const filteredSteps = sources
    ? steps.filter((step) => {
        if (step.type !== "search") return true;
        return sources.includes(step.params.source);
      })
    : steps;

  // Re-index steps after filtering
  const reindexed = filteredSteps.map((step, i) => ({ ...step, index: i }));

  return {
    title: template.buildTitle(topic),
    description: template.description,
    steps: reindexed,
    isTemplate: true,
    templateId: template.id,
  };
}
