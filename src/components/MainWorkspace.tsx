// components/MainWorkspace.tsx
// REDESIGNED: Cream/Sage palette, sidebar layout, animated transitions, mobile-first
'use client'

import { TamboProvider } from '@tambo-ai/react'
import { useState, useCallback, useEffect, useRef } from 'react'
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

type WorkspaceView =
  | 'search'
  | 'collections'
  | 'calendar'
  | 'notes'
  | 'studio'
  | 'analytics'
  | 'map'
  | 'canvas'
  | 'workflows'
  | 'reports'

interface MainWorkspaceProps {
  user: User
}

// ─── View metadata for header display ───
const viewMeta: Record<WorkspaceView, { title: string; subtitle: string }> = {
  search:      { title: 'Search',       subtitle: 'Explore the web, GitHub, and images' },
  workflows:   { title: 'Workflows',    subtitle: 'Automate multi-step research' },
  reports:     { title: 'Reports',      subtitle: 'Generated research documents' },
  analytics:   { title: 'Analytics',    subtitle: 'Visualize your search data' },
  map:         { title: 'Map',          subtitle: 'Location-based results' },
  canvas:      { title: 'Canvas',       subtitle: 'Spatial component workspace' },
  collections: { title: 'Collections',  subtitle: 'Saved results and bookmarks' },
  calendar:    { title: 'Calendar',     subtitle: 'Research events and deadlines' },
  notes:       { title: 'Notes',        subtitle: 'Your research notebook' },
  studio:      { title: 'Studio',       subtitle: 'Generate and edit images' },
}

export function MainWorkspace({ user }: MainWorkspaceProps) {
  const [activeView, setActiveView] = useState<WorkspaceView>('search')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const mcpServers = useMcpServers()

  // ─── Responsive check ───
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ─── Animated view change ───
  const handleViewChange = useCallback((view: WorkspaceView) => {
    if (view === activeView) return
    setIsTransitioning(true)

    // Brief fade-out, then switch view, then fade-in
    setTimeout(() => {
      setActiveView(view)
      setIsTransitioning(false)

      // Scroll content to top on view change
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 180)
  }, [activeView])

  // ─── Tambo Context Helpers ───
  const activeViewHelper = useCallback(() => ({
    activeView,
    description: getViewDescription(activeView),
  }), [activeView])

  const inlineComponentsGuide = useCallback(() => ({
    description: `IMPORTANT: You have inline generative components that render rich UI directly in the chat thread. ALWAYS prefer rendering these components over plain text responses when the user asks about their data.

COMPONENT RENDERING RULES:
1. "What's my schedule?" / "Show my events" → Render CalendarInline component (NOT text list)
2. "Show my collections" / "What have I bookmarked?" → Render CollectionsInline component
3. "Show my notes" / "What notes have I saved?" → Render NotesInline component
4. "Show my edited images" / "What's in my studio?" → Render ImageStudioInline component
5. After creating a calendar event → Render CalendarInline to CONFIRM it appears
6. After bookmarking results → Render CollectionsInline to SHOW the saved items
7. After saving a note → Render NotesInline to CONFIRM it was saved

FILTERING:
- "Show my Learning Resources collection" → CollectionsInline with collectionName="Learning Resources"
- "Do I have any events about design?" → CalendarInline with filterTitle="design"
- "Show notes about React" → NotesInline with filterContent="React"

These components auto-fetch data from the API — you just need to render them with optional filter props. The user should see interactive cards with clickable links, not plain text.`,
  }), [])

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

  const meta = viewMeta[activeView]

  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
      mcpServers={mcpServers}
      contextHelpers={{
        currentView: activeViewHelper,
        inlineComponents: inlineComponentsGuide,
        workflowCapabilities: workflowCapabilitiesHelper,
        userInfo: userInfoHelper,
      }}
    >
      {/* ── Root Layout ── */}
      <div
        className="h-screen overflow-hidden relative fs-noise"
        style={{ background: 'var(--fs-cream-100)' }}
      >
        {/* Navigation Sidebar / Bottom Bar */}
        <NavigationBar
          activeView={activeView}
          onViewChange={handleViewChange}
          userEmail={user.email!}
        />

        {/* ── Main Content Area ── */}
        <main
          className="flex flex-col h-full transition-all"
          style={{
            marginLeft: isMobile ? 0 : 'var(--fs-sidebar-width)',
            paddingBottom: isMobile ? '80px' : 0, // space for mobile bottom bar
            transitionDuration: 'var(--fs-duration-slow)',
            transitionTimingFunction: 'var(--fs-ease-out)',
          }}
        >
          {/* ── View Header (shown for non-search views) ── */}
          {activeView !== 'search' && (
            <header
              className="shrink-0 px-6 md:px-8 pt-6 pb-4 fs-animate-in"
              style={{
                borderBottom: '1px solid var(--fs-border-light)',
                background: 'var(--fs-cream-50)',
              }}
            >
              <div className="max-w-6xl">
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    color: 'var(--fs-text-primary)',
                  }}
                >
                  {meta.title}
                </h2>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: 'var(--fs-text-muted)' }}
                >
                  {meta.subtitle}
                </p>
              </div>
            </header>
          )}

          {/* ── Content with animated transitions ── */}
          <div
            ref={contentRef}
            className="flex-1 overflow-hidden relative"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? 'translateY(6px)' : 'translateY(0)',
              transition: `opacity 180ms var(--fs-ease-out), transform 180ms var(--fs-ease-out)`,
            }}
          >
            {/* ── SEARCH: Full-screen message thread ── */}
            {activeView === 'search' && (
              <div className="h-full fs-animate-in">
                <MessageThreadFull />
              </div>
            )}

            {/* ── COLLECTIONS ── */}
            {activeView === 'collections' && (
              <ViewShell>
                <InteractableCollections collections={[]} />
                <FloatingChat />
              </ViewShell>
            )}

            {/* ── CALENDAR ── */}
            {activeView === 'calendar' && (
              <ViewShell>
                <InteractableCalendar events={[]} />
                <FloatingChat />
              </ViewShell>
            )}

            {/* ── NOTES ── */}
            {activeView === 'notes' && (
              <ViewShell>
                <InteractableNotes notes={[]} />
                <FloatingChat />
              </ViewShell>
            )}

            {/* ── STUDIO ── */}
            {activeView === 'studio' && (
              <ViewShell>
                <InteractableImageStudio variations={[]} currentPrompt="" />
                <FloatingChat />
              </ViewShell>
            )}

            {/* ── ANALYTICS ── */}
            {activeView === 'analytics' && (
              <ViewShell>
                <AnalyticsGraph />
                <FloatingChat />
              </ViewShell>
            )}

            {/* ── MAP ── */}
            {activeView === 'map' && (
              <ViewShell>
                <LocationMap />
                <FloatingChat />
              </ViewShell>
            )}

            {/* ── CANVAS ── */}
            {activeView === 'canvas' && (
              <ViewShell>
                <div
                  className="h-full rounded-2xl overflow-hidden"
                  style={{
                    background: 'var(--fs-cream-50)',
                    border: '1px solid var(--fs-border-light)',
                  }}
                >
                  <CanvasSpace className="h-full w-full" />
                </div>
                <FloatingChat defaultOpen />
              </ViewShell>
            )}

            {/* ── WORKFLOWS ── */}
            {activeView === 'workflows' && (
              <ViewShell>
                <InteractableWorkflowLibrary workflows={[]} />
                <FloatingChat defaultOpen />
              </ViewShell>
            )}

            {/* ── REPORTS ── */}
            {activeView === 'reports' && (
              <ViewShell>
                <InteractableReportsList reports={[]} />
                <FloatingChat />
              </ViewShell>
            )}
          </div>
        </main>

        {/* ── Global Control Bar (Cmd+K) ── */}
        <ControlBar />
      </div>
    </TamboProvider>
  )
}

// ─────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────

/** Wrapper for views that have interactable content + floating chat */
function ViewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full fs-animate-in">
      {children}
    </div>
  )
}

/** Floating chat panel — positioned bottom-right, passes className directly */
function FloatingChat({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <MessageThreadCollapsible
      defaultOpen={defaultOpen}
      height="80vh"
      className="absolute bottom-6 right-6 z-10"
    />
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