"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSpecialty } from '@/hooks/use-specialty';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppSidebar, AppSidebarProvider } from '@/components/layout/AppSidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { EditSpecialtyDialog } from '@/components/specialties/EditSpecialtyDialog';

interface Props { specialtyId: string }

export default function ClientSpecialtyPage({ specialtyId }: Props) {
  const { isAdmin } = useAuth();
  const { specialty, isLoading } = useSpecialty(specialtyId);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppSidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <UniversalHeader title="Chargement..." />
            <div className="flex-1 p-8" />
          </SidebarInset>
        </AppSidebarProvider>
      </ProtectedRoute>
    );
  }

  if (!specialty) {
    return (
      <ProtectedRoute>
        <AppSidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <UniversalHeader title="Spécialité introuvable" />
            <div className="flex-1 p-8" />
          </SidebarInset>
        </AppSidebarProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppSidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <UniversalHeader title={specialty.name} />
          <div className="flex-1 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold mb-2">{specialty.name}</h1>
                      {specialty.description && <p className="text-sm text-muted-foreground max-w-2xl whitespace-pre-wrap">{specialty.description}</p>}
                    </div>
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)} className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{specialty.progress?.totalLectures || 0}</div>
                      <div className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400">Cours</div>
                    </div>
                    <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">{specialty.progress?.completedLectures || 0}</div>
                      <div className="text-xs uppercase tracking-wide text-green-600 dark:text-green-400">Terminés</div>
                    </div>
                    <div className="rounded-md bg-purple-50 dark:bg-purple-900/20 p-4">
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{Math.round(specialty.progress?.questionProgress || 0)}%</div>
                      <div className="text-xs uppercase tracking-wide text-purple-600 dark:text-purple-400">Progression</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <EditSpecialtyDialog specialty={specialty} isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} onSpecialtyUpdated={() => window.location.reload()} />
        </SidebarInset>
      </AppSidebarProvider>
    </ProtectedRoute>
  );
}
