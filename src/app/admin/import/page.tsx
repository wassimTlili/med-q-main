'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { read, utils } from 'xlsx';

// Constants
const SUPPORTED_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];
const MAX_FILE_SIZE_MB = 8; // adjust as desired
const PREVIEW_LIMIT = 10;

// Safe integer parsing helper
const safeParseInt = (value: string): number | null => {
  if (value === undefined || value === null) return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
};

// Function to extract image URLs from text and clean the text
function extractImageUrlAndCleanText(text: string): { cleanedText: string; mediaUrl: string | null; mediaType: string | null } {
  // Regular expression to match URLs that start with http or https and end with common image extensions
  const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico))(\s|$)/gi;
  
  let cleanedText = text;
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;
  
  // Find the first image URL in the text
  const match = imageUrlRegex.exec(text);
  if (match) {
    mediaUrl = match[1];
    // Remove the URL from the text
    cleanedText = text.replace(match[0], '').trim();
    
    // Determine media type based on file extension
    const extension = mediaUrl.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        mediaType = 'image/jpeg';
        break;
      case 'png':
        mediaType = 'image/png';
        break;
      case 'gif':
        mediaType = 'image/gif';
        break;
      case 'webp':
        mediaType = 'image/webp';
        break;
      case 'svg':
        mediaType = 'image/svg+xml';
        break;
      case 'bmp':
        mediaType = 'image/bmp';
        break;
      case 'tiff':
        mediaType = 'image/tiff';
        break;
      case 'ico':
        mediaType = 'image/x-icon';
        break;
      default:
        mediaType = 'image';
    }
  }
  
  return { cleanedText, mediaUrl, mediaType };
}

interface Lecture {
  id: string;
  title: string;
  specialty: {
    id: string;
    name: string;
  };
}

interface ImportPreview {
  totalQuestions: number;
  matchedLectures: number;
  unmatchedLectures: number;
  specialties: string[];
  sheets: {
    [sheetName: string]: {
      totalQuestions: number;
      questionType: string;
      previewData: Array<{
        matiere: string;
        cours: string;
        questionNumber: number;
        questionText: string;
        matchedLecture?: Lecture;
        mediaUrl?: string | null;
        mediaType?: string | null;
        caseNumber?: number;
        caseText?: string;
        caseQuestionNumber?: number;
        options?: string[];
        correctAnswers?: string[];
      }>;
    };
  };
}

interface ImportProgress {
  progress: number;
  phase: 'validating' | 'importing' | 'complete';
  message: string;
  logs: string[];
  stats?: any;
}

interface SheetError {
  sheet: string;
  missingHeaders?: string[];
  message: string;
}

export default function ImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [sheetErrors, setSheetErrors] = useState<SheetError[]>([]);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeImportRef = useRef<boolean>(false);
  const abortControllersRef = useRef<AbortController[]>([]);

  const fetchData = async () => {
    try {
      const [lecturesRes, specialtiesRes] = await Promise.all([
        fetch('/api/lectures'),
        fetch('/api/specialties')
      ]);
      
      if (lecturesRes.ok) {
        const lecturesData = await lecturesRes.json();
        setLectures(lecturesData);
      }
      
      if (specialtiesRes.ok) {
        const specialtiesData = await specialtiesRes.json();
        setSpecialties(specialtiesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Debug progress state changes
  useEffect(() => {
    if (progress) {
      console.log('Progress state changed:', progress);
    }
  }, [progress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeImportRef.current = false;
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
      abortControllersRef.current.forEach(c => c.abort());
    };
  }, []);

  const findMatchingLecture = (matiere: string, cours: string): Lecture | undefined => {
    // First, find the specialty
    const specialty = specialties.find(s => 
      s.name.toLowerCase().includes(matiere.toLowerCase()) ||
      matiere.toLowerCase().includes(s.name.toLowerCase())
    );

    if (!specialty) {
      return undefined;
    }

    // Then find the lecture within that specialty
    return lectures.find(l => 
      l.specialty.id === specialty.id && 
      (l.title.toLowerCase().includes(cours.toLowerCase()) ||
       cours.toLowerCase().includes(l.title.toLowerCase()))
    );
  };

  const handleFileSelect = async (file: File) => {
    // Reset previous state
    setSheetErrors([]);
    setImportPreview(null);
    setImportResult(null);
    setProgress(null);

    // Basic validations
    if (!SUPPORTED_MIME.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: t('common.error'),
        description: t('admin.invalidFileType') || 'Unsupported file type.',
        variant: 'destructive'
      });
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      toast({
        title: t('common.error'),
        description: (t('admin.fileTooLarge') || 'File too large.') + ` (${sizeMB.toFixed(1)}MB > ${MAX_FILE_SIZE_MB}MB)` ,
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = read(arrayBuffer, { type: 'array' });

      const sheets = ['qcm', 'qroc', 'cas_qcm', 'cas_qroc'] as const;
      const sheetsData: any = {};
      const uniqueSpecialties = new Set<string>();
      const matchedLectures = new Set<string>();
      const unmatchedLectures = new Set<string>();
      const newSheetErrors: SheetError[] = [];

      for (const sheetName of sheets) {
        if (!workbook.Sheets[sheetName]) continue;

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length < 2) continue;

        const headerRow = jsonData[0] as string[];
        const header = headerRow.map(h => h?.toString().trim().toLowerCase() || '');

        let expectedHeaders: string[] = [];
        let questionType = '';
        switch (sheetName) {
          case 'qcm':
            expectedHeaders = ['matiere', 'cours', 'question n', 'source', 'texte de la question', 'option a', 'option b', 'option c', 'option d', 'option e', 'reponse'];
            questionType = 'MCQ';
            break;
          case 'qroc':
            expectedHeaders = ['matiere', 'cours', 'question n', 'source', 'texte de la question', 'reponse'];
            questionType = 'QROC';
            break;
          case 'cas_qcm':
            expectedHeaders = ['matiere', 'cours', 'cas n', 'source', 'texte du cas', 'question n', 'texte de question', 'option a', 'option b', 'option c', 'option d', 'option e', 'reponse'];
            questionType = 'Clinical MCQ';
            break;
          case 'cas_qroc':
            expectedHeaders = ['matiere', 'cours', 'cas n', 'source', 'texte du cas', 'question n', 'texte de question', 'reponse'];
            questionType = 'Clinical QROC';
            break;
          default:
            continue;
        }

        const missingHeaders = expectedHeaders.filter(h => !header.includes(h));
        if (missingHeaders.length > 0) {
          newSheetErrors.push({ sheet: sheetName, missingHeaders, message: `Missing headers: ${missingHeaders.join(', ')}` });
          continue; // Skip this sheet
        }

        const previewData: any[] = [];
        let validQuestionCount = 0;

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          const values = row.map(cell => cell?.toString().trim() || '');

          // Build rowData safely
            const rowData: Record<string,string> = {};
            header.forEach((h, idx) => { rowData[h] = values[idx] || ''; });

          // Consider a row a question only if matiere + cours + (question text) present
          const questionTextColumn = (sheetName === 'cas_qcm' || sheetName === 'cas_qroc') ? 'texte de question' : 'texte de la question';
          const hasCore = rowData['matiere'] && rowData['cours'] && rowData[questionTextColumn];
          if (!hasCore) continue;

          validQuestionCount++;

          uniqueSpecialties.add(rowData['matiere']);
          const lectureKey = `${rowData['matiere']}:${rowData['cours']}`;
          const matchedLecture = findMatchingLecture(rowData['matiere'], rowData['cours']);
          if (matchedLecture) matchedLectures.add(lectureKey); else unmatchedLectures.add(lectureKey);

          if (previewData.length < PREVIEW_LIMIT) {
            const { cleanedText, mediaUrl, mediaType } = extractImageUrlAndCleanText(rowData[questionTextColumn]);
            const questionNumber = safeParseInt(rowData['question n']);
            const previewItem: any = {
              matiere: rowData['matiere'],
              cours: rowData['cours'],
              questionNumber: questionNumber ?? undefined,
              questionText: cleanedText,
              matchedLecture,
              mediaUrl,
              mediaType
            };
            if (sheetName === 'cas_qcm' || sheetName === 'cas_qroc') {
              previewItem.caseNumber = safeParseInt(rowData['cas n']);
              previewItem.caseText = rowData['texte du cas'] || null;
              previewItem.caseQuestionNumber = questionNumber ?? null;
            }
            if (sheetName === 'qcm' || sheetName === 'cas_qcm') {
              const options: string[] = [];
              for (let j = 0; j < 5; j++) {
                const optionKey = `option ${String.fromCharCode(97 + j)}`;
                if (rowData[optionKey]) options.push(rowData[optionKey]);
              }
              previewItem.options = options;
              previewItem.correctAnswers = rowData['reponse'] ? [rowData['reponse']] : [];
            }
            previewData.push(previewItem);
          }
        }

        if (validQuestionCount > 0) {
          sheetsData[sheetName] = {
            totalQuestions: validQuestionCount,
            questionType,
            previewData
          };
        }
      }

      if (Object.keys(sheetsData).length === 0) {
        setSheetErrors(prev => [...prev, ...newSheetErrors]);
        toast({
          title: t('common.error'),
          description: newSheetErrors.length > 0 ? 'All sheets invalid or missing headers.' : 'No valid sheets found.',
          variant: 'destructive'
        });
        return;
      }

      setSheetErrors(newSheetErrors);
      setImportPreview({
        totalQuestions: Object.values(sheetsData).reduce((sum: number, sheet: any) => sum + sheet.totalQuestions, 0),
        matchedLectures: matchedLectures.size,
        unmatchedLectures: unmatchedLectures.size,
        specialties: Array.from(uniqueSpecialties),
        sheets: sheetsData
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: t('common.error'),
        description: 'Error parsing Excel file. Please check the file format.',
        variant: 'destructive'
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: t('common.error'), description: t('admin.pleaseSelectFileFirst'), variant: 'destructive' });
      return;
    }
    if (sheetErrors.some(e => e.missingHeaders)) {
      toast({ title: t('common.error'), description: 'Fix sheet header issues before importing.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setProgress(null);
    setImportResult(null);
    activeImportRef.current = true;

    try {
      // OPTIONS preflight (not strictly needed for same-origin but kept)
      const optionsController = new AbortController();
      abortControllersRef.current.push(optionsController);
      await fetch('/api/questions/bulk-import-progress', { method: 'OPTIONS', signal: optionsController.signal });

      setProgress({ progress: 0, phase: 'validating', message: t('admin.startingImport') || 'Starting import...', logs: [] });

      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadController = new AbortController();
      abortControllersRef.current.push(uploadController);
      const response = await fetch('/api/questions/bulk-import-progress', { method: 'POST', body: formData, signal: uploadController.signal });
      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || 'Upload failed');
      }
      let responseData: any = {};
      try { responseData = await response.json(); } catch { throw new Error('Invalid JSON response'); }
      const backendImportId = responseData?.importId;
      if (!backendImportId) throw new Error('Missing importId in response');

      await new Promise(r => setTimeout(r, 400));

      const poll = async () => {
        if (!activeImportRef.current) return;
        try {
          const controller = new AbortController();
            abortControllersRef.current.push(controller);
          const res = await fetch(`/api/questions/bulk-import-progress?importId=${encodeURIComponent(backendImportId)}`, { signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!activeImportRef.current) return;
          setProgress(data);
          if (data.progress < 100) {
            pollingTimeoutRef.current = setTimeout(poll, 1000);
          } else {
            activeImportRef.current = false;
            setImportResult(data.stats);
            setIsUploading(false);
            if (data.stats?.failed > 0) {
              toast({ title: t('admin.importWithErrors'), description: `${t('admin.questionsImportedOf')} ${data.stats.imported}/${data.stats.total}`, variant: 'default' });
            } else {
              toast({ title: t('admin.importSuccess'), description: `${t('admin.questionsImportedOf')} ${data.stats.imported}/${data.stats.total}`, variant: 'default' });
            }
          }
        } catch (err) {
          if (!activeImportRef.current) return; // probably aborted
          console.error('Polling error', err);
          setIsUploading(false);
          activeImportRef.current = false;
          toast({ title: t('common.error'), description: t('admin.failedToUploadFile'), variant: 'destructive' });
        }
      };
      poll();
    } catch (error: any) {
      activeImportRef.current = false;
      setIsUploading(false);
      toast({ title: t('common.error'), description: error?.message || t('admin.failedToUploadFile'), variant: 'destructive' });
    }
  };

  const handleReset = () => {
    activeImportRef.current = false;
    if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    abortControllersRef.current.forEach(c => c.abort());
    abortControllersRef.current = [];
    setSelectedFile(null);
    setImportPreview(null);
    setImportResult(null);
    setProgress(null);
    setSheetErrors([]);
    setIsUploading(false);
  };

  const handleBack = () => {
    router.push('/admin');
  };

  return (
    <ProtectedRoute requireAdmin>
      <AdminRoute>
        <AdminLayout>
          <div className="space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <Button variant="ghost" size="sm" onClick={handleBack} className="order-2 sm:order-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
              <div className="order-1 sm:order-2">
                <h1 className="text-xl sm:text-2xl font-bold">{t('admin.multiSheetImport')}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('admin.expectedSheets')}</p>
              </div>
            </div>

            {!selectedFile ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="h-5 w-5" />
                    {t('admin.selectExcelFile')}
                  </CardTitle>
                  <CardDescription className="text-sm">{t('admin.requiredExcelFormat')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-48 sm:h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">{t('admin.selectExcelFile')}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">XLSX or XLS</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {/* File Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <FileText className="h-5 w-5" />
                      {selectedFile.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                      <div>
                        <p className="text-xs sm:text-sm font-medium">{t('admin.totalQuestions')}</p>
                        <p className="text-xl sm:text-2xl font-bold">{importPreview?.totalQuestions || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium">{t('admin.specialties')}</p>
                        <p className="text-xl sm:text-2xl font-bold">{importPreview?.specialties.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium">{t('admin.matchedLectures')}</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">{importPreview?.matchedLectures || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium">{t('admin.unmatchedLectures')}</p>
                        <p className="text-xl sm:text-2xl font-bold text-orange-600">{importPreview?.unmatchedLectures || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sheet Errors (if any) */}
                {sheetErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {sheetErrors.map((e, idx) => (
                        <div key={idx} className="text-[11px] sm:text-xs">
                          <strong>{e.sheet}</strong>: {e.message}
                        </div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Preview */}
                {importPreview && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('admin.importPreview')}</CardTitle>
                      <CardDescription className="text-sm">{t('admin.previewFirst10')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 sm:space-y-6">
                        {Object.entries(importPreview.sheets).map(([sheetName, sheetData]) => (
                          <div key={sheetName} className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base sm:text-lg font-semibold capitalize">{sheetName.replace('_', ' ')}</h3>
                              <Badge variant="outline">{sheetData.questionType}</Badge>
                              <Badge variant="secondary">{sheetData.totalQuestions} questions</Badge>
                            </div>
                            
                            <div className="space-y-2 sm:space-y-3">
                              {sheetData.previewData.map((item, index) => (
                                <div key={index} className="flex items-start gap-3 sm:gap-4 p-3 border rounded-lg">
                                  <div className="flex-shrink-0">
                                    {item.matchedLecture ? (
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-orange-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <Badge variant={item.matchedLecture ? 'default' : 'secondary'}>
                                        {item.matiere}
                                      </Badge>
                                      <Badge variant={item.matchedLecture ? 'default' : 'secondary'}>
                                        {item.cours}
                                      </Badge>
                                      <Badge variant="outline">
                                        #{item.questionNumber}
                                      </Badge>
                                      {item.caseNumber && (
                                        <Badge variant="outline">
                                          Case #{item.caseNumber}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {item.caseText && (
                                      <div className="mb-2 p-2 bg-muted rounded text-[11px] sm:text-xs">
                                        <strong>Case:</strong> {item.caseText.substring(0, 100)}...
                                      </div>
                                    )}
                                    
                                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                                      {item.questionText}
                                    </p>
                                    
                                    {item.options && item.options.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        <p className="text-[11px] sm:text-xs font-semibold">Options:</p>
                                        {item.options.map((option, optIndex) => (
                                          <p key={optIndex} className="text-[11px] sm:text-xs text-muted-foreground ml-2">
                                            {String.fromCharCode(65 + optIndex)}. {option}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {item.mediaUrl && (
                                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                                        <span className="font-semibold">{t('admin.image')}:</span> {item.mediaUrl}
                                      </p>
                                    )}
                                    
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                                      {item.matchedLecture ? t('admin.matched') : t('admin.unmatched')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {importPreview.unmatchedLectures > 0 && (
                        <Alert className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {t('admin.someLecturesNotMatched')}
                            {importPreview.unmatchedLectures > 0 && (
                              <span className="font-medium"> {t('admin.willCreateLectures')}</span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Progress */}
                {progress && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        {progress.phase === 'validating' && <FileText className="h-5 w-5" />}
                        {progress.phase === 'importing' && <Upload className="h-5 w-5 animate-pulse" />}
                        {progress.phase === 'complete' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {progress.message}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span>{t('admin.importProgress')}</span>
                          <span>{progress.progress.toFixed(2)}%</span>
                        </div>
                        <Progress value={progress.progress} className="w-full" />
                      </div>

                      {/* Live Logs */}
                      {progress.logs.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Live Logs</h4>
                            <Badge variant="outline">{progress.logs.length}</Badge>
                          </div>
                          <ScrollArea className="h-40 sm:h-48 w-full border rounded-md p-3 bg-muted/50">
                            <div className="space-y-1">
                              {progress.logs.map((log, index) => (
                                <div key={index} className="text-[11px] sm:text-xs font-mono text-muted-foreground">
                                  {log}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Import Results */}
                {importResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        {t('admin.importResults')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-4">
                        <div>
                          <p className="text-xs sm:text-sm font-medium">{t('admin.totalQuestions')}</p>
                          <p className="text-xl sm:text-2xl font-bold">{importResult.total}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium">{t('admin.importSuccessful')}</p>
                          <p className="text-xl sm:text-2xl font-bold text-green-600">{importResult.imported}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium">{t('admin.failed')}</p>
                          <p className="text-xl sm:text-2xl font-bold text-red-600">{importResult.failed}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium">{t('admin.createdNewSpecialties')}</p>
                          <p className="text-xl sm:text-2xl font-bold text-blue-600">{importResult.createdSpecialties}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-4">
                        {importResult.createdLectures > 0 && (
                          <div>
                            <p className="text-xs sm:text-sm font-medium">{t('admin.createdNewLectures')}</p>
                            <p className="text-lg sm:text-xl font-bold text-blue-600">{importResult.createdLectures}</p>
                          </div>
                        )}

                        {importResult.createdCases > 0 && (
                          <div>
                            <p className="text-xs sm:text-sm font-medium">Clinical Cases Created</p>
                            <p className="text-lg sm:text-xl font-bold text-indigo-600">{importResult.createdCases}</p>
                          </div>
                        )}

                        {importResult.questionsWithImages > 0 && (
                          <div>
                            <p className="text-xs sm:text-sm font-medium">{t('admin.questionsWithImages')}</p>
                            <p className="text-lg sm:text-xl font-bold text-blue-600">{importResult.questionsWithImages}</p>
                          </div>
                        )}
                      </div>

                      {importResult.errors && importResult.errors.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" className="w-full">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              {t('admin.viewErrors')} ({importResult.errors.length})
                              <ChevronDown className="h-4 w-4 ml-auto" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                              <ScrollArea className="h-56 sm:h-64">
                                <div className="space-y-1">
                                  {importResult.errors.map((error: string, index: number) => (
                                    <div key={index} className="text-[11px] sm:text-xs text-red-600">
                                      {error}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {!isUploading && !importResult && (
                    <Button onClick={handleUpload} className="w-full sm:flex-1" disabled={sheetErrors.length > 0}>
                      <Upload className="h-4 w-4 mr-2" />
                      {t('admin.importQuestions')}
                    </Button>
                  )}
                  {isUploading && (
                    <Button variant="outline" onClick={handleReset} disabled={!isUploading} className="w-full sm:w-auto">
                      {t('common.cancel') || 'Cancel'}
                    </Button>
                  )}
                  {!isUploading && (
                    <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
                      {importResult ? t('admin.importAnotherFile') : t('common.reset')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </AdminLayout>
      </AdminRoute>
    </ProtectedRoute>
  );
}