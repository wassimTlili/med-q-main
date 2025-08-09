'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLecturePageRoute() {
  const params = useParams()
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to admin page with lectures tab since we now use modals
    router.push('/admin?tab=lectures')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Redirecting...</h2>
        <p className="text-muted-foreground">
          Lecture management has moved to the admin panel.
        </p>
      </div>
    </div>
  )
} 