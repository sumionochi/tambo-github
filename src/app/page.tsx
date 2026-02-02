import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to tambo-github
        </h1>
        <p className="text-gray-600 mb-8">
          Hey {user.email}! Start analyzing your Github codebase with tambo-ai.
        </p>
        
        {/* Your main app content here */}
        <div className="border rounded-lg p-6">
          <p>Authenticated with Tambo + Supabase ✓</p>
        </div>
      </div>
    </div>
  )
}