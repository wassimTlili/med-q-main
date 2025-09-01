"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Calendar } from 'lucide-react';
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
                    <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 px-6 py-4 rounded-xl shadow-lg backdrop-blur-sm">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                      <span className="text-blue-800 dark:text-blue-200 font-medium">Chargement des spécialités...</span>
                    </div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg rounded-xl p-8">
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">Aucune spécialité</h3>
                      <p className="text-blue-600 dark:text-blue-400 text-center">
                        {query ? 'Aucun résultat pour cette recherche.' : "Aucune session d'examen disponible."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {filtered.map((specialty) => {
                      const iconData = specialty.icon ? getMedicalIcon(specialty.icon) : getIconBySpecialtyName(specialty.name);
                      const IconComp = iconData.icon;
                      return (
                        <Link
                          key={specialty.id}
                          href={`/session/${specialty.id}?name=${encodeURIComponent(specialty.name)}`}
                          className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 rounded-2xl transition"
                        >
                          <div className="relative h-full rounded-2xl border border-border/50 bg-white/60 dark:bg-muted/40 backdrop-blur-sm overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-blue-500/25 hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-400/40 via-blue-600/10 to-blue-400/40" />
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-blue-50/50 via-blue-100/30 to-indigo-50/40 dark:from-blue-900/30 dark:via-blue-800/20 dark:to-blue-900/30" />
                            
                            {/* Header section with gradient */}
                            <div className="bg-gradient-to-r from-blue-50/40 to-blue-100/30 dark:from-blue-900/30 dark:to-blue-800/20 border-b border-blue-100/50 dark:border-blue-800/50 p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-lg border-2 border-white/20 group-hover:scale-110 transition-transform">
                                  <IconComp className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-bold line-clamp-1 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors text-blue-900 dark:text-blue-100">{specialty.name}</h3>
                                  {specialty.semester && (
                                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                                      <Users className="h-3 w-3" /> Semestre {specialty.semester.order}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Content section */}
                            <div className="p-4 flex flex-col h-full relative z-10">
                              {specialty.description && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 line-clamp-3 mb-4 leading-relaxed">{specialty.description}</p>
                              )}
                              
                              {/* Session stats */}
                              <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 mb-4">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                  <span>Sessions disponibles</span>
                                </div>
                                {specialty._count?.sessions && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{specialty._count.sessions} session{specialty._count.sessions > 1 ? 's' : ''}</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-auto">
                                {specialty._count?.sessions ? (
                                  <div className="flex items-center justify-between">
                                    <Badge variant="secondary" className="text-[10px] font-medium rounded-full px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                                      {specialty._count.sessions} session{specialty._count.sessions > 1 ? 's' : ''}
                                    </Badge>
                                    <div className="text-xs text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors font-medium">
                                      Voir tout →
                                    </div>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] rounded-full px-3 py-1 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20">
                                    Aucune session
                                  </Badge>
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
