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
import { Upload, Plus, UploadCloud, ChevronDown, ChevronRight } from 'lucide-react';
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
      } catch (e) {
        // silent
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadSemesters = async () => {
      const params = manualNiveauId ? `?niveauId=${encodeURIComponent(manualNiveauId)}` : '';
      const res = await fetch(`/api/semesters${params}`);
      if (res.ok) setSemesters(await res.json());
    };
    loadSemesters();
  }, [manualNiveauId]);

  const parseCSVLike = async (file: File) => {
    // Expect CSV: name,pdfUrl,correctionUrl,niveau,semestre,specialty
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const out: SessionRow[] = [];
    const startIdx = 1; // assume first row is header
    for (const line of lines.slice(startIdx)) {
      const cols = line.split(','); // naive CSV split (no quote handling)
      const [name, pdfUrl, correctionUrl, niveau, semestre, specialty] = cols.map(c => c?.trim());
      if (name) out.push({ name, pdfUrl, correctionUrl, niveau, semestre, specialty });
    }
    setRows(out);
  };

  const parseXLSX = async (file: File) => {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    const ws = workbook.Sheets[firstSheet];
    const json = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, any>[];
    const norm = (s: string) => String(s || '').trim().toLowerCase();
    const aliasMap: Record<string, 'name' | 'pdfUrl' | 'correctionUrl' | 'niveau' | 'semestre' | 'specialty'> = {
      name: 'name', nom: 'name', titre: 'name',
      pdf: 'pdfUrl', pdfurl: 'pdfUrl', 'pdf url': 'pdfUrl', lienpdf: 'pdfUrl',
      correction: 'correctionUrl', 'correction url': 'correctionUrl', correctionurl: 'correctionUrl', liencorrection: 'correctionUrl',
      niveau: 'niveau', level: 'niveau',
      semestre: 'semestre', semester: 'semestre', s: 'semestre',
      speciality: 'specialty', specialty: 'specialty', matiere: 'specialty', specialite: 'specialty', 'specialité': 'specialty'
    };
    const out: SessionRow[] = [];
    for (const row of json) {
      const acc: SessionRow = { name: '' };
      for (const [k, v] of Object.entries(row)) {
        const mapped = aliasMap[norm(k)];
        if (mapped) {
          (acc as any)[mapped] = String(v || '').trim();
        }
      }
      if (acc.name) out.push(acc);
    }
    setRows(out);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setIsUploading(true);
    try {
      let ok = 0;
      let fail = 0;
      const errors: string[] = [];
      for (const r of rows) {
        // Resolve niveauId by name (case-insensitive) if provided
        let niveauId: string | undefined;
        if (r.niveau) {
          const match = niveaux.find(n => n.name.toLowerCase() === r.niveau!.toLowerCase());
          if (match) niveauId = match.id;
        }
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: r.name,
            pdfUrl: r.pdfUrl,
            correctionUrl: r.correctionUrl,
            niveauId,
            semester: r.semestre,
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
        pdfUrl: manual.pdfUrl,
        correctionUrl: manual.correctionUrl,
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
                <div className="flex items-center gap-3">
                  <Button onClick={handleImport} disabled={!rows.length || isUploading}>
                    <Upload className="h-4 w-4 mr-2" /> Import
                  </Button>
                  <div className="text-sm text-muted-foreground">{rows.length} rows ready</div>
                </div>
                {hasRows && (
                  <div className="border rounded-md">
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
                        {rows.slice(0, 20).map((r, i) => (
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
                    {rows.length > 20 && (
                      <div className="text-xs text-muted-foreground px-3 py-2">Showing first 20 of {rows.length} rows</div>
                    )}
                  </div>
                )}
              </CardContent>
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
