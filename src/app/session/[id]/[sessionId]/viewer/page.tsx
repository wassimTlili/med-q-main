'use client'

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  EyeOff, 
  FileText, 
  Loader2, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Document, Page } from '@/components/pdf/ClientPDF';
import { useAuth } from '@/contexts/AuthContext';
import { PDFProvider } from '@/components/pdf/PDFProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { AppSidebar, AppSidebarProvider } from '@/components/layout/AppSidebar';
import { SidebarInset } from '@/components/ui/sidebar';

// Import CSS for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

type Session = {
  id: string;
  name: string;
  pdfUrl?: string;
  correctionUrl?: string;
  specialty: {
    id: string;
    name: string;
  };
  niveau?: {
    name: string;
  };
  semester?: {
    name: string;
    order: number;
  };
};

// Helper to sanitize / normalize PDF links (Google Drive share -> direct download)
function getValidPdfLink(dbLink?: string | null): string | undefined {
  if (!dbLink) return undefined;
  // Already looks like a direct PDF
  if (/\.pdf($|[?#])/i.test(dbLink)) return dbLink;
  // Google Drive patterns
  const driveRegex = /https?:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i;
  const match = dbLink.match(driveRegex);
  if (match) {
    const id = match[1];
  return `https://drive.google.com/uc?export=download&id=${id}`; // will be proxied client-side
  }
  // If already a uc?export form keep it
  if (/https?:\/\/drive\.google\.com\/uc\?export=download&id=/i.test(dbLink)) return dbLink;
  return dbLink; // fallback unchanged
}

export default function SessionViewerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [showCorrection, setShowCorrection] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const viewType = searchParams.get('type') || 'exam';
  const canViewCorrection = user?.role === 'admin' || user?.role === 'maintainer';

  // Normalize params
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const specialtyId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  // Sanitize exam and correction URLs independently
  const examUrlRaw = session?.pdfUrl ? getValidPdfLink(session.pdfUrl) : undefined;
  const correctionUrlRaw = session?.correctionUrl ? getValidPdfLink(session.correctionUrl) : undefined;
  const examUrl = examUrlRaw ? (/drive\.google\.com/.test(examUrlRaw) ? `/api/proxy-pdf?url=${encodeURIComponent(examUrlRaw)}` : examUrlRaw) : undefined;
  const correctionUrl = correctionUrlRaw ? (/drive\.google\.com/.test(correctionUrlRaw) ? `/api/proxy-pdf?url=${encodeURIComponent(correctionUrlRaw)}` : correctionUrlRaw) : undefined;
  const currentPdfUrl = showCorrection ? correctionUrl : examUrl;
  const canShowCorrection = !!(session && canViewCorrection && correctionUrlRaw);

  // Fetch session data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!sessionId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) {
              setSession(null);
              setError('Session introuvable');
            }
          } else {
            const txt = await res.text().catch(() => '');
            console.warn('Fetch session error', res.status, txt);
            if (!cancelled) setError('Erreur lors du chargement de la session');
          }
        } else {
          const data = await res.json();
          if (!cancelled) {
            setSession(data);
            if (viewType === 'correction') setShowCorrection(true);
          }
        }
      } catch (e) {
        console.error('Network error session fetch', e);
        if (!cancelled) setError('Erreur réseau');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [sessionId, viewType]);

  // PDF handlers
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoadingPdf(false);
    setPdfError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error', err);
    setLoadingPdf(false);
    // Normalize common pdf.js error types
    if ((err as any)?.name === 'MissingPDFException') {
      setPdfError('Document PDF introuvable.');
    } else if ((err as any)?.name === 'InvalidPDFException') {
      setPdfError('Fichier PDF invalide ou corrompu.');
    } else if ((err as any)?.name === 'UnexpectedResponseException') {
      setPdfError('Réponse inattendue lors du chargement du PDF.');
    } else {
      setPdfError('Erreur lors du chargement du PDF.');
    }
  }, []);

  const changePage = (delta: number) => {
    setPageNumber(prev => {
      const n = prev + delta;
      return Math.max(1, Math.min(n, numPages || 1));
    });
  };

  const changeScale = (delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(prev + delta, 3)));
  };

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error('Fullscreen error', e);
    }
  };

  // Pre-validate PDF via HEAD (or GET fallback) when URL changes to surface errors early.
  useEffect(() => {
    if (!currentPdfUrl) return;
    let cancelled = false;
    setPdfError(null);
    setLoadingPdf(true);
    const controller = new AbortController();
    const validate = async () => {
      try {
        // Skip preflight for proxied (local) URL; proxy enforces type
        if (!currentPdfUrl.startsWith('/api/proxy-pdf')) {
          let res = await fetch(currentPdfUrl, { method: 'HEAD', signal: controller.signal });
          if (!res.ok) {
            if (!cancelled) setPdfError(`Impossible de charger le PDF (HTTP ${res.status}).`);
            return;
          }
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('pdf')) {
            if (!cancelled) setPdfError('Le lien ne pointe pas vers un PDF.');
            return;
          }
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.error('PDF HEAD validation error', e);
        if (!cancelled) setPdfError('Erreur réseau lors de la vérification du PDF.');
      }
    };
    validate();
    return () => { cancelled = true; controller.abort(); };
  }, [currentPdfUrl]);

  return (
    <ProtectedRoute>
      <AppSidebarProvider>
        <PDFProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
              <UniversalHeader
                title={session ? session.name : loading ? 'Chargement…' : (error || 'Session')}
                hideSeparator
                actions={(
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(specialtyId ? `/session/${specialtyId}` : '/session')} className="gap-1">
                      <ArrowLeft className="h-4 w-4" /> Retour
                    </Button>
                    {session && session.niveau && <Badge variant="outline" className="hidden sm:inline-flex">{session.niveau.name}</Badge>}
                    {session && session.semester && <Badge variant="outline" className="hidden sm:inline-flex">S{session.semester.order}</Badge>}
                  </div>
                )}
              />
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                {loading ? (
                  <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : !session ? (
                  <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">{error || 'Session non trouvée'}</h2>
                    <div className="flex gap-2">
                      <Button onClick={() => router.push(specialtyId ? `/session/${specialtyId}` : '/session')} size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                      </Button>
                      {sessionId && (
                        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
                          Réessayer
                        </Button>
                      )}
                    </div>
                  </div>
                ) : !currentPdfUrl ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">{showCorrection ? 'Correction non disponible' : 'Document non disponible'}</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        {showCorrection
                          ? "La correction de cet examen n'est pas encore disponible."
                          : "Le document de cet examen n'est pas disponible."}
                      </p>
                      {canShowCorrection && !showCorrection && session.correctionUrl && (
                        <Button onClick={() => setShowCorrection(true)}>Voir la correction</Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => changePage(-1)} disabled={pageNumber <= 1}>Précédent</Button>
                            <span className="text-sm text-muted-foreground">Page {pageNumber} / {numPages || 1}</span>
                            <Button variant="outline" size="sm" onClick={() => changePage(1)} disabled={pageNumber >= (numPages || 1)}>Suivant</Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => changeScale(-0.2)} disabled={scale <= 0.5}><ZoomOut className="h-4 w-4" /></Button>
                            <span className="text-sm text-muted-foreground min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
                            <Button variant="outline" size="sm" onClick={() => changeScale(0.2)} disabled={scale >= 3}><ZoomIn className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => setRotation(prev => (prev + 90) % 360)}><RotateCw className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={toggleFullscreen}>{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>
                          </div>
                          <div className="flex items-center gap-2">
                            {!showCorrection && session.pdfUrl && (<Badge variant="default">Examen</Badge>)}
                            {showCorrection && session.correctionUrl && (<Badge variant="secondary">Correction</Badge>)}
                            {canShowCorrection && (
                              <Button
                                variant={showCorrection ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setShowCorrection(!showCorrection)}
                                disabled={!session.correctionUrl}
                              >
                                {showCorrection ? (<><Eye className="h-4 w-4 mr-2" />Voir l'examen</>) : (<><EyeOff className="h-4 w-4 mr-2" />Voir la correction</>)}
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => window.open(currentPdfUrl, '_blank')}>
                              <Download className="h-4 w-4 mr-2" /> Télécharger
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-0">
                        <div className="flex justify-center bg-gray-100 dark:bg-gray-900 min-h-[600px] relative">
                          {pdfError ? (
                            <div className="flex flex-col items-center justify-center text-center p-8 gap-3 max-w-md">
                              <FileText className="h-10 w-10 text-red-500" />
                              <p className="font-medium">{pdfError}</p>
                              <div className="flex gap-2">
                                {session?.pdfUrl && showCorrection && (
                                  <Button size="sm" variant="outline" onClick={() => setShowCorrection(false)}>
                                    Voir l'examen
                                  </Button>
                                )}
                                {canShowCorrection && session?.correctionUrl && !showCorrection && (
                                  <Button size="sm" variant="outline" onClick={() => setShowCorrection(true)}>
                                    Voir la correction
                                  </Button>
                                )}
                                <Button size="sm" onClick={() => setRotation(r => (r + 90) % 360)} variant="secondary">Tourner</Button>
                                <Button size="sm" variant="outline" onClick={() => window.open(currentPdfUrl, '_blank')}>Ouvrir dans un onglet</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {loadingPdf && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span>Chargement du PDF...</span>
                                  </div>
                                </div>
                              )}
                              <Document
                                file={currentPdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={onDocumentLoadError}
                                loading=""
                                className="flex justify-center"
                              >
                                <Page
                                  pageNumber={pageNumber}
                                  scale={scale}
                                  rotate={rotation}
                                  className="shadow-lg"
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                              </Document>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </SidebarInset>
          </div>
        </PDFProvider>
      </AppSidebarProvider>
    </ProtectedRoute>
  );
}
