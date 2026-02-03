// components/MainWorkspace.tsx
'use client'

import { TamboProvider } from '@tambo-ai/react'
import { useState } from 'react'
import { ControlBar } from './layout/ControlBar'
import { MessageThreadFull } from '@/components/tambo/message-thread-full'
import { useMcpServers } from '@/components/tambo/mcp-config-modal'
import { components, tools } from '@/lib/tambo'
import type { User } from '@supabase/supabase-js'

type WorkspaceView = 'search' | 'collections' | 'calendar' | 'notes' | 'studio'

interface MainWorkspaceProps {
  user: User
}

export function MainWorkspace({ user }: MainWorkspaceProps) {
  const [activeView, setActiveView] = useState<WorkspaceView>('search')
  const mcpServers = useMcpServers()

  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
      mcpServers={mcpServers}
    >
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Top Navigation Bar */}
        <ControlBar
          activeView={activeView}
          onViewChange={setActiveView}
          userEmail={user.email!}
        />

        {/* Content Area - Switch based on active view */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'search' && (
            <MessageThreadFull />
          )}

          {activeView === 'collections' && (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium">Collections View</p>
                <p className="text-sm mt-2">Coming soon in Phase 4</p>
              </div>
            </div>
          )}

          {activeView === 'calendar' && (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium">Calendar View</p>
                <p className="text-sm mt-2">Coming soon in Phase 4</p>
              </div>
            </div>
          )}

          {activeView === 'notes' && (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium">Notes View</p>
                <p className="text-sm mt-2">Coming soon in Phase 4</p>
              </div>
            </div>
          )}

          {activeView === 'studio' && (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium">Image Studio</p>
                <p className="text-sm mt-2">Coming soon in Phase 4</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TamboProvider>
  )
}