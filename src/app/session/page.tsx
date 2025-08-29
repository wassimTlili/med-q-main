"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText } from 'lucide-react';
import Link from 'next/link';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { AppSidebar, AppSidebarProvider } from '@/components/layout/AppSidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

type Specialty = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  semester?: { id: string; name: string; order: number };
  _count?: { sessions: number };
};

import { getMedicalIcon, getIconBySpecialtyName } from '@/lib/medical-icons';

export default function SessionsPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const response = await fetch('/api/specialties/with-sessions');
        if (response.ok) {
          const data = await response.json();
          setSpecialties(data);
        }
      } catch (error) {
        console.error('Failed to load specialties:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSpecialties();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return specialties;
    const q = query.toLowerCase();
    return specialties.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description?.toLowerCase().includes(q))
    );
  }, [query, specialties]);

  return (
    <ProtectedRoute>
      <AppSidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <UniversalHeader
              title="Sessions d'examens"
              showSearch
              searchValue={query}
              onSearchChange={setQuery}
              searchPlaceholder="Chercher une spécialité..."
              hideSeparator
            />
            <div className="flex-1 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {loading ? (
                  <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : filtered.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Aucune spécialité</h3>
                      <p className="text-muted-foreground text-center">
                        {query ? 'Aucun résultat pour cette recherche.' : "Aucune session d'examen disponible."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {filtered.map((specialty) => {
                      const iconData = specialty.icon ? getMedicalIcon(specialty.icon) : getIconBySpecialtyName(specialty.name);
                      const IconComp = iconData.icon;
                      return (
                        <Link
                          key={specialty.id}
                          href={`/session/${specialty.id}?name=${encodeURIComponent(specialty.name)}`}
                          className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-2xl transition"
                        >
                          <div className="relative h-full rounded-2xl border border-border/60 dark:border-border/40 bg-white/90 dark:bg-gray-800/70 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/40 transition-all">
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" />
                            <div className="p-5 flex flex-col h-full relative z-10">
                              <div className="flex items-start gap-4 mb-4">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-900 border border-gray-200 dark:border-gray-600 shadow ${iconData.color} ${iconData.darkColor} group-hover:scale-105 transition-transform`}>
                                  <IconComp className="w-7 h-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-semibold line-clamp-1 group-hover:text-primary transition-colors">{specialty.name}</h3>
                                  {specialty.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{specialty.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="mt-auto flex items-center gap-2 pt-2">
                                {specialty._count?.sessions ? (
                                  <Badge variant="secondary" className="text-[10px] font-medium rounded-full px-2 py-0.5">{specialty._count.sessions} session{specialty._count.sessions > 1 ? 's' : ''}</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0.5">Aucune session</Badge>
                                )}
                                {specialty.semester && (
                                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                    <Users className="h-3 w-3" /> S{specialty.semester.order}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </SidebarInset>
        </div>
      </AppSidebarProvider>
    </ProtectedRoute>
  );
}
