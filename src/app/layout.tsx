import { createClient } from '@/lib/supabase/server'
import ClientLayout from './client-layout'
import './globals.css'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en">
      <body>
        <ClientLayout userToken={session?.access_token}>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}