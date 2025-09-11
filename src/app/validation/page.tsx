"use client";
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { read, utils, write } from 'xlsx';

type SheetName = 'qcm' | 'qroc' | 'cas_qcm' | 'cas_qroc';
type GoodRow = { sheet: SheetName; row: number; data: Record<string, any> };
type BadRow = { sheet: SheetName; row: number; reason: string; original: Record<string, any> };

export default function ValidationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [good, setGood] = useState<GoodRow[]>([]);
  const [bad, setBad] = useState<BadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiFixed, setAiFixed] = useState<any[]>([]);

  const onFileChange = (f: File) => { setFile(f); setGood([]); setBad([]); setAiFixed([]); };

  const validate = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/validation', { method: 'POST', body: fd });
      const json = await res.json();
      setGood(json.good || []);
      setBad(json.bad || []);
    } finally { setLoading(false); }
  };

  const download = async (mode: 'good'|'bad') => {
    const payload = encodeURIComponent(JSON.stringify({ good, bad }));
    const url = `/api/validation?mode=${mode}&payload=${payload}`;
    window.open(url, '_blank');
  };

  const aiAssist = async () => {
    if (!bad.length) return;
    setAiBusy(true);
    try {
      const res = await fetch('/api/validation/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: bad })
      });
      const json = await res.json();
      setAiFixed(json.fixed || []);
    } finally { setAiBusy(false); }
  };

  const revalidateFixed = async () => {
    // Convert AI fixed rows into an in-memory XLSX and re-run validate API by sending that file
    const header = ['sheet','matiere','cours','question n','texte de la question','reponse','option a','option b','option c','option d','option e','explication'];
    const rows = aiFixed.map(r => ({
      sheet: r.sheet,
      matiere: r.fixed?.['matiere'] ?? '',
      cours: r.fixed?.['cours'] ?? '',
      'question n': r.fixed?.['question n'] ?? '',
      'texte de la question': r.fixed?.['texte de la question'] ?? '',
      reponse: r.fixed?.['reponse'] ?? '',
      'option a': r.fixed?.['option a'] ?? '',
      'option b': r.fixed?.['option b'] ?? '',
      'option c': r.fixed?.['option c'] ?? '',
      'option d': r.fixed?.['option d'] ?? '',
      'option e': r.fixed?.['option e'] ?? '',
      explication: r.fixed?.['explication'] ?? ''
    }));
    const wb = utils.book_new();
    const bySheet: Record<string, any[]> = { qcm: [], qroc: [], cas_qcm: [], cas_qroc: [] } as any;
    rows.forEach(r => { (bySheet[r.sheet] ||= []).push(r); });
    (Object.keys(bySheet) as SheetName[]).forEach(s => {
      if (!bySheet[s] || bySheet[s].length === 0) return;
      const ws = utils.json_to_sheet(bySheet[s], { header });
      utils.book_append_sheet(wb, ws, s);
    });
    const buf = writeXlsxBuffer(wb);
    const newFile = new File([buf], 'ai_fixed.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fd = new FormData(); fd.append('file', newFile);
    setLoading(true);
    try {
      const res = await fetch('/api/validation', { method: 'POST', body: fd });
      const json = await res.json();
      setGood(json.good || []);
      setBad(json.bad || []);
    } finally { setLoading(false); }
  };

  const passGoodToImport = async () => {
    // Post the original file to the existing bulk import, or in future directly pass structured good rows
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    await fetch('/api/questions/bulk-import-progress', { method: 'POST', body: fd });
    // User can switch to Admin Import page to see progress
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Validation</CardTitle>
          <CardDescription>Filtrer votre fichier: obtenir lignes valides et erreurs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input type="file" accept=".xlsx" onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f); }} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={validate} disabled={!file || loading}>{loading ? 'Validation…' : 'Valider'}</Button>
            <Button variant="outline" onClick={() => download('good')} disabled={!good.length}>Télécharger valides</Button>
            <Button variant="outline" onClick={() => download('bad')} disabled={!bad.length}>Télécharger erreurs</Button>
            <Button variant="secondary" onClick={passGoodToImport} disabled={!good.length}>Envoyer valides à l’import</Button>
          </div>
          <div className="flex gap-4">
            <Badge variant="outline">Valides: {good.length}</Badge>
            <Badge variant="destructive">Erreurs: {bad.length}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assistance IA</CardTitle>
          <CardDescription>Corriger les erreurs (réponses et explications) automatiquement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={aiAssist} disabled={!bad.length || aiBusy}>{aiBusy ? 'IA en cours…' : 'Corriger les erreurs avec IA'}</Button>
            <Button variant="outline" onClick={revalidateFixed} disabled={!aiFixed.length}>Revalider les corrections</Button>
            <Button variant="secondary" onClick={passGoodToImport} disabled={!aiFixed.length}>Importer après correction</Button>
          </div>
          <div className="text-sm text-muted-foreground">Corrections prêtes: {aiFixed.length}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function writeXlsxBuffer(wb: any): ArrayBuffer {
  const buf = write(wb, { type: 'array', bookType: 'xlsx' });
  return buf as unknown as ArrayBuffer;
}
