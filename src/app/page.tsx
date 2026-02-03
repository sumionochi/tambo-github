import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MainWorkspace } from '@/components/MainWorkspace'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <MainWorkspace user={user} />
}