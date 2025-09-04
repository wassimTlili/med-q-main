'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect legacy /admin to the new rich dashboard
export default function AdminPageRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/dashboard'); }, [router]);
  return (
    <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
      Redirection vers le nouveau tableau de bord...
    </div>
  );
}