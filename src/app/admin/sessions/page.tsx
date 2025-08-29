'use client'

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Plus, UploadCloud, ChevronDown, ChevronRight, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';

type SessionRow = {
  name: string;
  pdfUrl?: string;
  correctionUrl?: string;
  niveau?: string;
  semestre?: string | number;
  specialty?: string;
};

// Reuse logic similar to viewer (simplified to avoid circular import)
const normalizeDriveLink = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  const link = raw.trim();
  if (!link) return undefined;
  if (/\.pdf($|[?#])/i.test(link)) return link; // already direct pdf
  // direct download already
  if (/drive\.google\.com\/uc\?export=download&id=/i.test(link)) return link;
  const driveRegex = /https?:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i;
  const match = link.match(driveRegex);
  if (match) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return link; // fallback unchanged
};

export default function SessionsAdminPage() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [manual, setManual] = useState<SessionRow>({ name: '' });
  const [manualNiveauId, setManualNiveauId] = useState<string>('');
  const [manualSemester, setManualSemester] = useState<string>('');
  const [manualSpecialty, setManualSpecialty] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [niveaux, setNiveaux] = useState<{ id: string; name: string }[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [semesters, setSemesters] = useState<{ id: string; name: string; order: number; niveauId: string }[]>([]);
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<{ ok: number; fail: number; total: number; errors: string[] } | null>(null);

  useEffect(() => {
    // Load niveaux list for resolution and manual select
    const load = async () => {
      try {
        const res = await fetch('/api/niveaux');
        if (res.ok) {
          const data = await res.json();
          setNiveaux(data);
        }
        const specs = await fetch('/api/specialties/list');
        if (specs.ok) setSpecialties(await specs.json());
      } catch {
        // silent
      }
    };
    load();
  }, []);

  // CSV: name,pdfUrl,correctionUrl,niveau,semestre,specialty
  const parseCSVLike = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) { setRows([]); return; }
    const out: SessionRow[] = [];
    for (const line of lines.slice(1)) {
      const cols = line.split(',');
      const [name, pdfUrl, correctionUrl, niveau, semestre, specialty] = cols.map(c => c?.trim());
      if (!name) continue;
      out.push({
        name,
        pdfUrl: normalizeDriveLink(pdfUrl),
        correctionUrl: normalizeDriveLink(correctionUrl),
        niveau,
        semestre,
        specialty
      });
    }
    setRows(out);
  };

  // XLSX parser that preserves hyperlink targets for pdf/correction
  const parseXLSX = async (file: File) => {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    const ws = workbook.Sheets[firstSheet];
    const ref = ws['!ref'];
    if (!ref) { setRows([]); return; }
    const range = XLSX.utils.decode_range(ref as string);
    const norm = (s: string) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
    const alias: Record<string, keyof SessionRow> = {
      name: 'name', nom: 'name', titre: 'name',
      pdf: 'pdfUrl', pdfurl: 'pdfUrl', pdfurl2: 'pdfUrl', pdfurl3: 'pdfUrl', pdfurlhttp: 'pdfUrl', lienpdf: 'pdfUrl', urlexamen: 'pdfUrl', urlexam: 'pdfUrl', urlexamencorrection: 'pdfUrl', urlexamens: 'pdfUrl', urlexamenpdf: 'pdfUrl', urlexamenurl: 'pdfUrl', urlexamenhttp: 'pdfUrl', urlexamenhttps: 'pdfUrl', urlexamenfile: 'pdfUrl', urlpdf: 'pdfUrl', urlpdfexamen: 'pdfUrl',
      correction: 'correctionUrl', correctionurl: 'correctionUrl', liencorrection: 'correctionUrl', urlcorrection: 'correctionUrl', urlcorr: 'correctionUrl', urlcorrections: 'correctionUrl', urlcorrectionpdf: 'correctionUrl', urlcorrectionurl: 'correctionUrl', urlcorrectionhttp: 'correctionUrl', urlcorrectionhttps: 'correctionUrl',
      niveau: 'niveau', level: 'niveau', semestre: 'semestre', semester: 'semestre', s: 'semestre',
      speciality: 'specialty', specialty: 'specialty', matiere: 'specialty', specialite: 'specialty', specialiteaccent: 'specialty', specialite2: 'specialty', specialite3: 'specialty'
    };
    const headerRow = range.s.r;
    const colMap: Record<number, keyof SessionRow | undefined> = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ c, r: headerRow })];
      if (!cell) continue;
      colMap[c] = alias[norm(String(cell.v || ''))];
    }
    const out: SessionRow[] = [];
    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const acc: SessionRow = { name: '' };
      let empty = true;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const key = colMap[c];
        if (!key) continue;
        const cell: any = ws[XLSX.utils.encode_cell({ c, r })];
        if (!cell) continue;
        const raw = (cell.v != null ? String(cell.v) : '').trim();
        if (raw) empty = false;
        let value = raw;
        if ((key === 'pdfUrl' || key === 'correctionUrl') && cell.l && cell.l.Target) value = cell.l.Target;
        if (key === 'pdfUrl') acc.pdfUrl = normalizeDriveLink(value);
        else if (key === 'correctionUrl') acc.correctionUrl = normalizeDriveLink(value);
        else if (key === 'niveau') acc.niveau = value;
        else if (key === 'semestre') acc.semestre = value;
        else if (key === 'specialty') acc.specialty = value;
        else if (key === 'name') acc.name = value;
      }
      if (!empty && acc.name) out.push(acc);
    }
    setRows(out);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setIsUploading(true);
  setImportSummary(null);
    try {
      let ok = 0;
      let fail = 0;
      const errors: string[] = [];
      const normNiveau = (s: string) => s.toLowerCase().replace(/\s|-/g, ''); // PCEM 1 -> pcem1
      for (const r of rows) {
        // Resolve niveauId by name (case-insensitive) if provided
        let niveauId: string | undefined;
        if (r.niveau) {
          // Try exact (case-insensitive)
          let match = niveaux.find(n => n.name.toLowerCase() === r.niveau!.toLowerCase());
          // Try normalized (remove spaces / hyphens)
            if (!match) {
              const target = normNiveau(r.niveau);
              match = niveaux.find(n => normNiveau(n.name) === target);
            }
            // Try pattern PCEM 1 -> PCEM1
            if (!match) {
              const m = r.niveau.match(/^(PCEM|DCEM)\s?(\d)$/i);
              if (m) {
                const compact = (m[1] + m[2]).toUpperCase();
                match = niveaux.find(n => n.name.toUpperCase() === compact);
              }
            }
            if (match) niveauId = match.id;
        }
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: r.name,
            pdfUrl: normalizeDriveLink(r.pdfUrl),
            correctionUrl: normalizeDriveLink(r.correctionUrl),
            niveauId,
            // Normalize semester input: could be '1','S1','s1','PCEM1 - S1'. Extract first digit 1 or 2.
            semester: (() => {
              if (!r.semestre) return undefined;
              const raw = String(r.semestre).trim();
              // Find a number 1 or 2 (common for S1/S2) OR parseInt fallback
              const m = raw.match(/S?\s*(\d)/i);
              if (m) return m[1];
              const d = parseInt(raw, 10);
              if (!isNaN(d)) return d;
              return raw; // let API attempt resolution by name contains
            })(),
            specialtyName: r.specialty
          })
        });
        if (res.ok) {
          ok++;
        } else {
          fail++;
          let msg = '';
          try {
            // Try reading JSON from a cloned response to avoid consuming the original body
            const j = await res.clone().json();
            msg = j?.error || j?.message || JSON.stringify(j);
          } catch {
            try { msg = await res.text(); } catch { /* ignore */ }
          }
          errors.push(`${r.name}: ${msg || res.statusText}`);
        }
      }
      setImportSummary({ ok, fail, total: rows.length, errors });
      if (fail === 0) {
        toast({ title: 'Import completed', description: `${ok}/${rows.length} session(s) imported.` });
      } else {
        toast({ title: 'Import completed with errors', description: `${ok} success, ${fail} failed`, variant: 'destructive' });
        console.error('Session import errors:', errors);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualCreate = async () => {
    if (!manual.name) return;
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: manual.name,
  pdfUrl: normalizeDriveLink(manual.pdfUrl),
  correctionUrl: normalizeDriveLink(manual.correctionUrl),
        niveauId: manualNiveauId || undefined,
        semester: manualSemester || undefined,
        specialtyName: manualSpecialty || undefined
      })
    });
    if (res.ok) {
      setManual({ name: '' });
      setManualNiveauId('');
      setManualSemester('');
      setManualSpecialty('');
      toast({ title: 'Session created', description: manual.name });
    } else {
      let msg = '';
      try {
        const j = await res.clone().json();
        msg = j?.error || j?.message || JSON.stringify(j);
      } catch {
        try { msg = await res.text(); } catch { /* ignore */ }
      }
      toast({ title: 'Failed to create session', description: msg || `${res.status} ${res.statusText}`, variant: 'destructive' });
    }
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.csv')) return parseCSVLike(file);
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return parseXLSX(file);
    // default try CSV
    return parseCSVLike(file);
  };

  const hasRows = rows.length > 0;

  return (
    <ProtectedRoute requireAdmin>
      <AdminRoute>
        <AdminLayout>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Sessions (Exams)</CardTitle>
                <CardDescription>Upload an Excel/CSV with columns: name, pdfUrl, correctionUrl, niveau (opt), semestre (opt), specialty (opt)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <div
                    className={
                      `relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer select-none ` +
                      `${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}`
                    }
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) void handleFile(f);
                    }}
                    onClick={() => document.getElementById('sessions-file-input')?.dispatchEvent(new MouseEvent('click'))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('sessions-file-input')?.dispatchEvent(new MouseEvent('click')); }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud className={`h-6 w-6 ${isDragOver ? 'text-blue-600' : 'text-muted-foreground'}`} />
                      <div className="text-sm">
                        Drag and drop your file here, or click to browse
                      </div>
                      <div className="text-xs text-muted-foreground">Accepted: .xlsx, .xls, .csv</div>
                      {fileName && (
                        <div className="text-xs text-muted-foreground mt-1">Selected: {fileName}</div>
                      )}
                    </div>
                    <input
                      id="sessions-file-input"
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleFile(f);
                      }}
                    />
                  </div>
                </div>
                {importSummary ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <CheckCircle2 className={`h-10 w-10 ${importSummary.fail ? 'text-yellow-500' : 'text-green-500'}`} />
                    <div className="text-lg font-medium">Import finished</div>
                    <div className="text-sm text-muted-foreground">
                      {importSummary.ok}/{importSummary.total} success{importSummary.fail ? `, ${importSummary.fail} failed` : ''}
                    </div>
                    {importSummary.errors.length > 0 && (
                      <div className="w-full max-w-xl text-xs bg-destructive/10 border border-destructive/30 rounded p-3 space-y-1 overflow-auto max-h-48">
                        {importSummary.errors.map((e, i) => <div key={i}>• {e}</div>)}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => { setRows([]); setImportSummary(null); setFileName(''); }}>New Import</Button>
                      <Button variant="secondary" onClick={() => setImportSummary(null)}>View Rows</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Button onClick={handleImport} disabled={!rows.length || isUploading}>
                        <Upload className="h-4 w-4 mr-2" /> Import
                      </Button>
                      <div className="text-sm text-muted-foreground">{rows.length} rows ready</div>
                      {rows.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => { setRows([]); setFileName(''); }}>
                          <RotateCcw className="h-4 w-4 mr-1" /> Reset
                        </Button>
                      )}
                    </div>
                    {hasRows && (
                      <div className="border rounded-md relative">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>PDF URL</TableHead>
                              <TableHead>Correction URL</TableHead>
                              <TableHead>Niveau</TableHead>
                              <TableHead>Semestre</TableHead>
                              <TableHead>Specialty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.slice(0, 50).map((r, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{r.name}</TableCell>
                                <TableCell className="truncate max-w-[280px]">{r.pdfUrl}</TableCell>
                                <TableCell className="truncate max-w-[280px]">{r.correctionUrl}</TableCell>
                                <TableCell>{r.niveau || '-'}</TableCell>
                                <TableCell>{r.semestre || '-'}</TableCell>
                                <TableCell>{r.specialty || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {rows.length > 50 && (
                          <div className="text-xs text-muted-foreground px-3 py-2">Showing first 50 of {rows.length} rows</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-md">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-sm text-muted-foreground">Importing sessions… Please wait</div>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Add Session Manually</CardTitle>
                  <CardDescription>Quickly add a single session</CardDescription>
                </div>
                <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      {manualOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {manualOpen ? 'Hide' : 'Show'}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </CardHeader>
              <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
                <CollapsibleContent>
                  <CardContent className="space-y-3 pt-0">
                    <div>
                      <Label>Name</Label>
                      <Input value={manual.name} onChange={(e) => setManual(v => ({ ...v, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>PDF URL</Label>
                      <Input value={manual.pdfUrl || ''} onChange={(e) => setManual(v => ({ ...v, pdfUrl: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Correction URL</Label>
                      <Input value={manual.correctionUrl || ''} onChange={(e) => setManual(v => ({ ...v, correctionUrl: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Niveau (optional)</Label>
                      <Select value={manualNiveauId || 'none'} onValueChange={(val) => setManualNiveauId(val === 'none' ? '' : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select niveau" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {niveaux.map(n => (
                            <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Semestre (optional)</Label>
                      <Select value={manualSemester || 'none'} onValueChange={(val) => setManualSemester(val === 'none' ? '' : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {semesters.map(s => (
                            <SelectItem key={s.id} value={String(s.order)}>S{s.order}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Specialty (optional)</Label>
                      <Select value={manualSpecialty || 'none'} onValueChange={(val) => setManualSpecialty(val === 'none' ? '' : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {specialties.map(s => (
                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleManualCreate} disabled={!manual.name}>
                      <Plus className="h-4 w-4 mr-2" /> Create
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>
        </AdminLayout>
      </AdminRoute>
    </ProtectedRoute>
  );
}
