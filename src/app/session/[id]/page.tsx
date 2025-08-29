"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, FileText, Download, Eye, Users, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { AppSidebar, AppSidebarProvider } from '@/components/layout/AppSidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

type Session = {
  id: string;
  name: string;
  pdfUrl?: string;
  correctionUrl?: string;
  createdAt: string;
  niveau?: { id: string; name: string };
  semester?: { id: string; name: string; order: number };
};

type Specialty = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  semester?: { id: string; name: string; order: number };
  sessions: Session[];
};

import { getMedicalIcon, getIconBySpecialtyName } from '@/lib/medical-icons';

export default function SpecialtySessionsPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useAuth();
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const specialtyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const specialtyNameParam = search.get('name') || undefined;

  const fetchSpecialty = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = specialtyNameParam ? `?name=${encodeURIComponent(specialtyNameParam)}` : '';
      const response = await fetch(`/api/specialties/${id}/sessions${qs}`, { cache: 'no-store' });
      if (response.ok) {
        const data: Specialty = await response.json();
        setSpecialty(data);
      } else if (response.status === 404) {
        const basicRes = await fetch(`/api/specialties/${id}`, { cache: 'no-store' });
        if (basicRes.ok) {
          const basic = await basicRes.json();
          const sessionsRes = await fetch(`/api/sessions`, { cache: 'no-store' });
          if (sessionsRes.ok) {
            const allSessions = await sessionsRes.json();
            const filtered = (allSessions || []).filter((sx: any) => sx.specialty?.id === id);
            if (filtered.length > 0) {
              setSpecialty({ ...basic, sessions: filtered });
              return;
            }
          }
          setSpecialty(null);
          setError('Spécialité introuvable (fallback)');
        } else {
          setSpecialty(null);
          setError('Spécialité introuvable');
        }
      } else {
        setError('Erreur lors du chargement des sessions');
      }
    } catch (e) {
      console.error('Failed to load specialty sessions:', e);
      setError('Erreur réseau lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [specialtyNameParam]);

  useEffect(() => {
    if (specialtyId) fetchSpecialty(specialtyId);
  }, [specialtyId, specialtyNameParam, fetchSpecialty]);

  const canViewCorrection = user?.role === 'admin' || user?.role === 'maintainer';
  const filtered = useMemo(() => {
    if (!specialty) return [];
    if (!query.trim()) return specialty.sessions;
    const q = query.toLowerCase();
    return specialty.sessions.filter(s => s.name.toLowerCase().includes(q));
  }, [query, specialty]);

  return (
    <ProtectedRoute>
      <AppSidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <UniversalHeader
              title={specialty?.name || 'Spécialité'}
              hideSeparator
              actions={(
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => router.push('/session')} className="gap-1">
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </Button>
                </div>
              )}
            />
            <div className="flex-1 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {loading ? (
                  <div className="flex items-center justify-center min-h-[40vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !specialty ? (
                  <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">{error || 'Spécialité non trouvée'}</h2>
                    {specialtyId && <p className="text-xs text-muted-foreground break-all opacity-70">ID: {String(specialtyId)}</p>}
                    <div className="flex gap-2">
                      <Button onClick={() => router.push('/session')} size="sm" variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
                      </Button>
                      {specialtyId && (
                        <Button size="sm" onClick={() => fetchSpecialty(specialtyId!)}>
                          Réessayer
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {(specialty) && (() => {
                      const iconData = specialty.icon ? getMedicalIcon(specialty.icon) : getIconBySpecialtyName(specialty.name);
                      const IconComp = iconData.icon;
                      return (
                        <div className="relative overflow-hidden rounded-2xl border border-border/60 dark:border-border/40 bg-white/90 dark:bg-gray-800/70 backdrop-blur-sm p-6 flex flex-col gap-4">
                          <div className="flex items-start gap-5">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-900 border border-gray-200 dark:border-gray-600 shadow-sm ${iconData.color} ${iconData.darkColor}`}>
                              <IconComp className="w-10 h-10" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              {specialty.description && (
                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{specialty.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 items-center">
                                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
                                  {specialty.sessions.length} session{specialty.sessions.length > 1 ? 's' : ''}
                                </Badge>
                                {specialty.semester && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/40 dark:bg-muted/20 px-2 py-1 rounded-full border border-border/40">
                                    <Users className="h-3 w-3" /> S{specialty.semester.order}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="max-w-md relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Chercher une session" value={query} onChange={e => setQuery(e.target.value)} className="pl-9" />
                    </div>
                    {filtered.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">Aucune session</h3>
                          <p className="text-muted-foreground text-center">{query ? 'Aucun résultat pour cette recherche.' : 'Cette spécialité ne contient pas encore de sessions.'}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {filtered.map(session => {
                          const created = new Date(session.createdAt);
                          return (
                            <div key={session.id} className="group rounded-2xl border border-border/60 dark:border-border/40 bg-white/90 dark:bg-gray-800/70 backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all">
                              <div className="p-5 flex flex-col h-full">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="space-y-1 min-w-0">
                                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors flex items-center gap-1">
                                      <Calendar className="h-4 w-4 text-primary" /> {session.name}
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                                      {created.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0.5 self-start">{session.semester ? `S${session.semester.order}` : 'Exam'}</Badge>
                                </div>
                                <div className="mt-auto flex flex-col gap-2">
                                  {session.pdfUrl && (
                                    <Link href={`/session/${specialty.id}/${session.id}/viewer`} className="w-full">
                                      <Button size="sm" className="w-full justify-center text-xs"><Eye className="h-4 w-4 mr-1" /> Voir l'examen</Button>
                                    </Link>
                                  )}
                                  {session.correctionUrl && canViewCorrection && (
                                    <Link href={`/session/${specialty.id}/${session.id}/viewer?type=correction`} className="w-full">
                                      <Button size="sm" variant="outline" className="w-full justify-center text-xs"><Download className="h-4 w-4 mr-1" /> Correction</Button>
                                    </Link>
                                  )}
                                  {!session.pdfUrl && !session.correctionUrl && (
                                    <p className="text-[11px] text-muted-foreground text-center py-2">Aucun document</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </SidebarInset>
        </div>
      </AppSidebarProvider>
    </ProtectedRoute>
  );
}
