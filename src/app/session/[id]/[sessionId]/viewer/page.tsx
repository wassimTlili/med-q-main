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
  Minimize2,
  FileCheck2,
  X,
  PanelRightOpen,
  PanelRightClose,
  CheckCircle
} from 'lucide-react';
import { Document, Page } from '@/components/pdf/ClientPDF';
import { useAuth } from '@/contexts/AuthContext';
import { PDFProvider } from '@/components/pdf/PDFProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { AppSidebar, AppSidebarProvider } from '@/components/layout/AppSidebar';
import { SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { CorrectionZone } from '@/components/session/CorrectionZone';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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

// Component that uses sidebar state for responsive positioning
function ResponsiveCorrectionButton({ 
  canShowCorrection, 
  correctionUrl, 
  onClick 
}: { 
  canShowCorrection: boolean;
  correctionUrl: string | undefined;
  onClick: () => void;
}) {
  const { open } = useSidebar();
  
  if (!canShowCorrection || !correctionUrl) return null;
  
  return (
    <Button
      onClick={onClick}
      variant="default"
      className={`fixed bottom-6 shadow-xl rounded-full px-6 py-6 flex items-center gap-2 z-40 bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-200 dark:border-blue-800 transition-all duration-300 ${
        open ? 'left-[calc(16rem+1.5rem)]' : 'left-12'
      }`}
      title="Ouvrir le PDF de correction dans une fenêtre modale"
    >
      <FileCheck2 className="h-5 w-5" />
      <span className="hidden sm:inline text-sm font-medium">Correction PDF</span>
    </Button>
  );
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
  const [showCorrection, setShowCorrection] = useState(false); // legacy toggle – main area shows exam now
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const viewType = searchParams.get('type') || 'exam';
  // Allow all authenticated roles (including students) to view correction PDF
  const canViewCorrection = !!user; // previously restricted to admin/maintainer
  const mode: 'admin' | 'maintainer' | 'student' = user?.role === 'admin' ? 'admin' : user?.role === 'maintainer' ? 'maintainer' : 'student';

  // Normalize params
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const specialtyId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  // Sanitize exam and correction URLs independently
  const examUrlRaw = session?.pdfUrl ? getValidPdfLink(session.pdfUrl) : undefined;
  const correctionUrlRaw = session?.correctionUrl ? getValidPdfLink(session.correctionUrl) : undefined;
  const examUrl = examUrlRaw ? (/drive\.google\.com/.test(examUrlRaw) ? `/api/proxy-pdf?url=${encodeURIComponent(examUrlRaw)}` : examUrlRaw) : undefined;
  const correctionUrl = correctionUrlRaw ? (/drive\.google\.com/.test(correctionUrlRaw) ? `/api/proxy-pdf?url=${encodeURIComponent(correctionUrlRaw)}` : correctionUrlRaw) : undefined;
  const currentPdfUrl = examUrl; // always exam in main view
  const canShowCorrection = !!(session && canViewCorrection && correctionUrlRaw);

  // Auto open correction modal if ?type=correction
  useEffect(() => {
    if (viewType === 'correction' && canShowCorrection) {
      setCorrectionModalOpen(true);
    }
  }, [viewType, canShowCorrection]);

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => router.push(specialtyId ? `/session/${specialtyId}` : '/session')} className="gap-1 flex-shrink-0">
                      <ArrowLeft className="h-4 w-4" /> 
                      <span className="hidden sm:inline">Retour</span>
                    </Button>
                    <div className="hidden md:flex items-center gap-2">
                      {session && session.semester && <Badge variant="outline" className="text-xs">S{session.semester.order}</Badge>}
                    </div>
                  </div>
                )}
              />
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
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
                  <div className="flex flex-col xl:flex-row gap-4 lg:gap-6">
                    {/* PDF Zone */}
                    <div className={`space-y-3 lg:space-y-4 min-w-0 transition-all duration-300 ${
                      panelCollapsed ? 'xl:flex-1' : 'xl:flex-[2]'
                    } max-w-none`}>
                      <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-400/40 via-blue-600/10 to-blue-400/40" />
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
                            <div className="flex items-center gap-2 order-2 sm:order-1">
                              <Button variant="outline" size="sm" onClick={() => changePage(-1)} disabled={pageNumber <= 1} 
                                className="bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-xs">
                                <span className="hidden sm:inline">Précédent</span>
                                <span className="sm:hidden">Préc</span>
                              </Button>
                              <span className="text-sm text-blue-800 dark:text-blue-200 font-medium whitespace-nowrap">Page {pageNumber} / {numPages || 1}</span>
                              <Button variant="outline" size="sm" onClick={() => changePage(1)} disabled={pageNumber >= (numPages || 1)}
                                className="bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-xs">
                                <span className="hidden sm:inline">Suivant</span>
                                <span className="sm:hidden">Suiv</span>
                              </Button>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                              <Button variant="outline" size="sm" onClick={() => changeScale(-0.2)} disabled={scale <= 0.5}
                                className="bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 p-2">
                                <ZoomOut className="h-4 w-4" />
                              </Button>
                              <span className="text-xs text-blue-800 dark:text-blue-200 font-medium min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                              <Button variant="outline" size="sm" onClick={() => changeScale(0.2)} disabled={scale >= 3}
                                className="bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 p-2">
                                <ZoomIn className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setRotation(prev => (prev + 90) % 360)}
                                className="bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 p-2">
                                <RotateCw className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={toggleFullscreen}
                                className="bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 p-2 hidden sm:flex">
                                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 order-3 flex-wrap">
                              {session.pdfUrl && (<Badge variant="default" className="bg-blue-600 text-white text-xs">Examen</Badge>)}
                              {session && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setPanelCollapsed(c=>!c)} 
                                  className="bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 gap-2"
                                >
                                  {panelCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                                  <span className="hidden sm:inline text-xs">
                                    {panelCollapsed ? 'Afficher Correction' : 'Masquer Correction'}
                                  </span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-400/40 via-blue-600/10 to-blue-400/40" />
                        <CardContent className="p-0">
                          <div className="flex justify-center bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 min-h-[600px] relative rounded-md overflow-hidden">
                            {pdfError ? (
                              <div className="flex flex-col items-center justify-center text-center p-8 gap-3 max-w-md">
                                <div className="w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="font-medium text-blue-800 dark:text-blue-200">{pdfError}</p>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => setRotation(r => (r + 90) % 360)} variant="outline"
                                    className="bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                                    Tourner
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => window.open(currentPdfUrl, '_blank')}
                                    className="bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                                    Ouvrir dans un onglet
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {loadingPdf && (
                                  <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-white/20 dark:bg-slate-900/20">
                                    <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 px-4 py-3 rounded-xl shadow-lg">
                                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                      <span className="text-blue-800 dark:text-blue-200 font-medium">Chargement du PDF...</span>
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
                                    className="shadow-xl bg-white rounded-lg border-2 border-blue-100 dark:border-blue-800"
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                  />
                                </Document>
                              </>
                            )}
                            {canShowCorrection && correctionUrl && (
                              <Button
                                size="sm"
                                className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => setCorrectionModalOpen(true)}
                                variant="default"
                              >
                                <FileCheck2 className="h-4 w-4 mr-2" /> Correction
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Correction Zone - Aligned Header */}
                    {session && !panelCollapsed && (
                      <div className="w-full xl:flex-1 xl:min-w-[400px] xl:max-w-[500px] flex-shrink-0 transition-all duration-300">
                        <div className="space-y-3 lg:space-y-4">
                          {/* Correction Zone Header - Aligned with PDF Controls */}
                          <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-400/40 via-blue-600/10 to-blue-400/40" />
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-center gap-2 text-xs sm:text-sm">
                                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Zone de Correction</span>
                                <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">(éditeur)</Badge>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* Correction Zone Content */}
                          <div className="sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
                            <CorrectionZone sessionId={session.id} mode={mode} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Dialog open={correctionModalOpen} onOpenChange={setCorrectionModalOpen}>
                  <DialogContent className="max-w-[85vw] w-[85vw] h-[85vh] p-3 flex flex-col border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-xl">
                    <DialogTitle className="sr-only">Correction PDF</DialogTitle>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-400/40 via-blue-600/10 to-blue-400/40" />
                    <div className="flex items-center justify-between px-3 py-2 border-b border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/50 to-blue-100/30 dark:from-blue-900/30 dark:to-blue-800/20 rounded-t-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary" className="hidden sm:inline-flex bg-blue-600 text-white">Correction</Badge>
                        <span className="font-medium truncate max-w-[40vw] text-blue-800 dark:text-blue-200">{session?.name}</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-md mt-2 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                      {canShowCorrection && correctionUrl ? (
                        <ModalCorrectionPdf url={correctionUrl} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm text-blue-600 dark:text-blue-400 font-medium">Aucune correction disponible.</div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <ResponsiveCorrectionButton
                  canShowCorrection={canShowCorrection}
                  correctionUrl={correctionUrl}
                  onClick={() => setCorrectionModalOpen(true)}
                />
              </div>
            </SidebarInset>
          </div>
        </PDFProvider>
      </AppSidebarProvider>
    </ProtectedRoute>
  );
}

function ModalCorrectionPdf({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(0.75);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onLoadSuccess = ({ numPages }: { numPages: number }) => { setNumPages(numPages); setLoading(false); setError(null); };
  const onLoadError = (err: Error) => { console.error(err); setLoading(false); setError('Erreur de chargement du PDF.'); };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-200 dark:border-blue-800 bg-white/70 dark:bg-muted/40 text-xs">
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
          className="h-8 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800">
          Prev
        </Button>
        <span className="text-xs text-blue-800 dark:text-blue-200 font-medium min-w-[60px] text-center">{page} / {numPages || 1}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min((numPages || 1), p + 1))} disabled={page >= (numPages || 1)}
          className="h-8 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800">
          Next
        </Button>
        <div className="flex items-center gap-1 ml-2">
          <Button variant="outline" size="icon" className="h-7 w-7 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800" 
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-xs w-12 text-center text-blue-800 dark:text-blue-200 font-medium">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800" 
            onClick={() => setScale(s => Math.min(3, s + 0.1))}>
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800" 
            onClick={() => setRotation(r => (r + 90) % 360)}>
            <RotateCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto relative flex justify-center bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-white/20 dark:bg-slate-900/20">
            <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 px-4 py-3 rounded-xl shadow-lg">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-blue-800 dark:text-blue-200 font-medium">Chargement...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="flex flex-col items-center gap-3 bg-white/80 dark:bg-slate-800/80 px-6 py-4 rounded-xl shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-blue-800 dark:text-blue-200 font-medium text-center">{error}</span>
            </div>
          </div>
        )}
        <Document
          file={url}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          loading=""
          className="flex justify-center"
        >
          <div className="my-4">
            <Page
              pageNumber={page}
              scale={scale}
              rotate={rotation}
              className="shadow-xl border-2 border-blue-100 dark:border-blue-800 bg-white aspect-[1/1.4142] mx-auto rounded-lg"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        </Document>
      </div>
    </div>
  );
}
