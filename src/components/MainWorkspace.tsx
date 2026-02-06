// components/MainWorkspace.tsx
// CORRECTED: Uses Tambo's contextHelpers for AI context + proper suggestions integration
'use client'

import { TamboProvider } from '@tambo-ai/react'
import { useState, useCallback } from 'react'
import { NavigationBar } from './layout/NavigationBar'
import { MessageThreadFull } from '@/components/tambo/message-thread-full'
import { MessageThreadCollapsible } from '@/components/tambo/message-thread-collapsible'
import { CanvasSpace } from '@/components/tambo/canvas-space'
import { ControlBar } from '@/components/tambo/control-bar'
import { useMcpServers } from '@/components/tambo/mcp-config-modal'
import { components, tools } from '@/lib/tambo'
import type { User } from '@supabase/supabase-js'

// Import interactable components
import { InteractableCollections } from './interactable/Collections'
import { InteractableCalendar } from './interactable/Calendar'
import { InteractableNotes } from './interactable/Notes'
import { InteractableImageStudio } from './interactable/ImageStudio'
import { AnalyticsGraph } from './interactable/AnalyticsGraph'
import { LocationMap } from './interactable/LocationMap'

// Phase 3: Workflow & Report interactable components
import { InteractableWorkflowLibrary } from './interactable/WorkflowLibrary'
import { InteractableReportsList } from './interactable/ReportsList'

type WorkspaceView = 'search' | 'collections' | 'calendar' | 'notes' | 'studio' | 'analytics' | 'map' | 'canvas' | 'workflows' | 'reports'

interface MainWorkspaceProps {
  user: User
}

export function MainWorkspace({ user }: MainWorkspaceProps) {
  const [activeView, setActiveView] = useState<WorkspaceView>('search')
  const mcpServers = useMcpServers()

  // ─────────────────────────────────────────────────────
  // TAMBO CONTEXT HELPERS
  // These functions run on every message and inject context
  // so the AI knows what view the user is on and what's
  // available. This is what powers smart suggestions.
  // ─────────────────────────────────────────────────────

  const activeViewHelper = useCallback(() => ({
    activeView,
    description: getViewDescription(activeView),
  }), [activeView])

  const workflowCapabilitiesHelper = useCallback(() => ({
    availableTools: [
      'execute_research_workflow — Start a multi-step research workflow from natural language',
      'generate_report_from_collection — Generate a report from a saved collection',
      'get_workflow_status — Check progress of a running workflow',
    ],
    availableSources: ['google', 'github', 'pexels'],
    depthOptions: ['quick (3 steps)', 'standard (5 steps)', 'deep (8 steps)'],
    outputFormats: ['comparison', 'analysis', 'timeline', 'summary'],
    workflowExamples: [
      'Compare the top 5 JavaScript frameworks',
      'Research the AI coding assistant market',
      'Analyze trending GitHub repos for machine learning',
      'Find design inspiration images for dashboard UIs',
      'Create a timeline of web framework evolution',
    ],
  }), [])

  const userInfoHelper = useCallback(() => ({
    userId: user.id,
    email: user.email,
  }), [user.id, user.email])

  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
      mcpServers={mcpServers}
      // ── THIS IS THE KEY INTEGRATION ──
      // contextHelpers inject metadata into every AI message.
      // The AI uses this to:
      // 1. Know which view the user is on → smarter responses
      // 2. Know workflow capabilities → natural suggestions
      // 3. Know about the user → personalized experience
      contextHelpers={{
        currentView: activeViewHelper,
        workflowCapabilities: workflowCapabilitiesHelper,
        userInfo: userInfoHelper,
      }}
    >
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Navigation Bar */}
        <NavigationBar
          activeView={activeView}
          onViewChange={setActiveView}
          userEmail={user.email!}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {/* Search Mode: Full Message Thread */}
          {activeView === 'search' && (
            <MessageThreadFull />
          )}

          {/* Collections: Component + Collapsible Chat */}
          {activeView === 'collections' && (
            <div className="relative h-full">
              <InteractableCollections collections={[]} />
              <MessageThreadCollapsible
                defaultOpen={false}
                height="80vh"
                className="absolute bottom-6 right-6 z-10"
              />
            </div>
          )}

          {/* Calendar: Component + Collapsible Chat */}
          {activeView === 'calendar' && (
            <div className="relative h-full">
              <InteractableCalendar events={[]} />
              <MessageThreadCollapsible
                defaultOpen={false}
                height="80vh"
                className="absolute bottom-6 right-6 z-10"
              />
            </div>
          )}

          {/* Notes: Component + Collapsible Chat */}
          {activeView === 'notes' && (
            <div className="relative h-full">
              <InteractableNotes notes={[]} />
              <MessageThreadCollapsible
                defaultOpen={false}
                height="80vh"
                className="absolute bottom-6 right-6 z-10"
              />
            </div>
          )}

          {/* Studio: Component + Collapsible Chat */}
          {activeView === 'studio' && (
            <div className="relative h-full">
              <InteractableImageStudio
                variations={[]}
                currentPrompt=""
              />
              <MessageThreadCollapsible
                defaultOpen={false}
                height="80vh"
                className="absolute bottom-6 right-6 z-10"
              />
            </div>
          )}

          {/* Analytics: Component + Collapsible Chat */}
          {activeView === 'analytics' && (
            <div className="relative h-full">
              <AnalyticsGraph />
              <MessageThreadCollapsible
                defaultOpen={false}
                height="80vh"
                className="absolute bottom-6 right-6 z-10"
              />
            </div>
          )}

          {/* Map: Component + Collapsible Chat */}
          {activeView === 'map' && (
            <div className="relative h-full">
              <LocationMap />
              <MessageThreadCollapsible
                defaultOpen={false}
                height="80vh"
                className="absolute bottom-6 right-6 z-10"
              />
            </div>
          )}

          {/* Canvas: CanvasSpace + Collapsible Chat */}
          {activeView === 'canvas' && (
            <div className="relative h-full">
              <div className="h-full bg-white">
                <CanvasSpace
                  className="h-full w-full"
                />
              </div>
              <MessageThreadCollapsible
                defaultOpen={true}
                height="80vh"
                className="absolute bottom-6 right-6 z-10"
              />
            </div>
          )}

          {/* Workflows: Component + Collapsible Chat */}
          {activeView === 'workflows' && (
            <div className="relative h-full">
              <InteractableWorkflowLibrary workflows={[]} />
              <MessageThreadCollapsible
                defaultOpen={true}
                height="80vh"
                className="absolute bottom-6 right-6 z-10"
              />
            </div>
          )}

          {/* Reports: Component + Collapsible Chat */}
          {activeView === 'reports' && (
            <div className="relative h-full">
              <InteractableReportsList reports={[]} />
              <MessageThreadCollapsible
                defaultOpen={false}
                height="80vh"
                className="absolute bottom-6 right-6 z-10"
              />
            </div>
          )}
        </div>

        {/* Floating Control Bar (Global Chat Shortcut - Cmd+K) */}
        <ControlBar />
      </div>
    </TamboProvider>
  )
}

// ─────────────────────────────────────────────────────
// View descriptions — the AI reads these to understand context
// ─────────────────────────────────────────────────────

function getViewDescription(view: WorkspaceView): string {
  const descriptions: Record<WorkspaceView, string> = {
    search: 'User is on the main Search page. They can search the web, GitHub, or Pexels. They can also start research workflows by describing a research goal.',
    workflows: 'User is on the Workflows page. They can see active, completed, and failed workflows. They can start new workflows or retry failed ones. Suggest workflow ideas.',
    reports: 'User is on the Reports page. They can browse generated reports from workflows and collections. They can ask to generate new reports.',
    analytics: 'User is viewing Analytics. They can see search data visualizations.',
    map: 'User is viewing the Map. They can see location-based search results.',
    canvas: 'User is on the Canvas. They can see generative components arranged spatially.',
    collections: 'User is on the Collections page. They can manage saved search results and bookmarks. They can also generate reports from collections.',
    calendar: 'User is viewing the Calendar. They can manage research events and deadlines.',
    notes: 'User is on the Notes page. They can create and manage research notes.',
    studio: 'User is in the Image Studio. They can generate and edit images.',
  }
  return descriptions[view]
}