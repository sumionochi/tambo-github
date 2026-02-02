'use client'

import { TamboProvider } from '@tambo-ai/react'
import { ReactNode } from 'react'

interface ClientLayoutProps {
  children: ReactNode
  userToken?: string
}

export default function ClientLayout({
  children,
  userToken,
}: ClientLayoutProps) {
  return (
    <TamboProvider 
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      userToken={userToken}
    >
      {children}
    </TamboProvider>
  )
}