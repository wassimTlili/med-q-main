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
};

export default function SessionsAdminPage() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [manual, setManual] = useState<SessionRow>({ name: '' });
  const [manualNiveauId, setManualNiveauId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [niveaux, setNiveaux] = useState<{ id: string; name: string }[]>([]);
  const [fileName, setFileName] = useState<string>('');
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
      } catch (e) {
        // silent
      }
    };
    load();
  }, []);

  const parseCSVLike = async (file: File) => {
    // For simplicity: expect a CSV or XLSX saved-as-CSV: name,pdfUrl,correctionUrl,niveau
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const out: SessionRow[] = [];
    const startIdx = 1; // assume first row is header
    for (const line of lines.slice(startIdx)) {
      const cols = line.split(','); // naive CSV split (no quote handling)
      const [name, pdfUrl, correctionUrl, niveau] = cols.map(c => c?.trim());
      if (name) out.push({ name, pdfUrl, correctionUrl, niveau });
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
    const aliasMap: Record<string, 'name' | 'pdfUrl' | 'correctionUrl' | 'niveau'> = {
      name: 'name', nom: 'name', titre: 'name',
      pdf: 'pdfUrl', pdfurl: 'pdfUrl', 'pdf url': 'pdfUrl', lienpdf: 'pdfUrl',
      correction: 'correctionUrl', 'correction url': 'correctionUrl', correctionurl: 'correctionUrl', liencorrection: 'correctionUrl',
      niveau: 'niveau', level: 'niveau'
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
      for (const r of rows) {
        // Resolve niveauId by name (case-insensitive) if provided
        let niveauId: string | undefined;
        if (r.niveau) {
          const match = niveaux.find(n => n.name.toLowerCase() === r.niveau!.toLowerCase());
          if (match) niveauId = match.id;
        }
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: r.name, pdfUrl: r.pdfUrl, correctionUrl: r.correctionUrl, niveauId })
        });
      }
  toast({ title: 'Import completed', description: `${rows.length} session(s) imported.` });
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualCreate = async () => {
    if (!manual.name) return;
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: manual.name, pdfUrl: manual.pdfUrl, correctionUrl: manual.correctionUrl, niveauId: manualNiveauId || undefined })
    });
    setManual({ name: '' });
    setManualNiveauId('');
  toast({ title: 'Session created', description: manual.name });
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
                <CardDescription>Upload an Excel/CSV with 4 columns: name, pdfUrl, correctionUrl, niveau (optional)</CardDescription>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.slice(0, 20).map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell className="truncate max-w-[280px]">{r.pdfUrl}</TableCell>
                            <TableCell className="truncate max-w-[280px]">{r.correctionUrl}</TableCell>
                            <TableCell>{r.niveau || '-'}</TableCell>
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
