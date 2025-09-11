"use client";

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

export default function AdminValidationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [good, setGood] = useState<any[]>([]);
  const [bad, setBad] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiUploadFile, setAiUploadFile] = useState<File | null>(null);
  const [aiPreview, setAiPreview] = useState<{ sheet: string; header: string[]; rows: any[][] } | null>(null);
  const [aiInstructions, setAiInstructions] = useState<string>("");
  const [filterLogs, setFilterLogs] = useState<string[]>([]);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [aiProgress, setAiProgress] = useState<number>(0);
  const [aiSummary, setAiSummary] = useState<{ fixed?: number; errors?: number } | null>(null);
  let aiProgressTimer: number | undefined;
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [lastImportId, setLastImportId] = useState<string | null>(null);

  const onFileChange = (f: File) => { setFile(f); setGood([]); setBad([]); setAiFile(null); setAiPreview(null); };

  const validate = async () => {
    if (!file) return;
    setLoading(true);
    try {
  setFilterLogs([]);
  setFilterLogs(prev => [...prev, `📤 Envoi du fichier: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`]);
      const fd = new FormData();
      fd.append('file', file);
  setFilterLogs(prev => [...prev, '⚙️ Validation en cours…']);
      const res = await fetch('/api/validation', { method: 'POST', body: fd });
      const json = await res.json();
      setGood(json.good || []);
      setBad(json.bad || []);
  setFilterLogs(prev => [...prev, `✅ Terminé: ${json.goodCount ?? (json.good?.length||0)} valides, ${json.badCount ?? (json.bad?.length||0)} erreurs`]);
    } finally { setLoading(false); }
  };

  const download = async (mode: 'good'|'bad') => {
    // For good rows, produce an import-ready multi-sheet workbook
    const f = mode === 'good' ? await buildImportFileFromGood() : await buildFileFromCurrent(mode);
    if (!f) return;
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url; a.download = f.name; a.click();
    URL.revokeObjectURL(url);
  };

  // Build a .xlsx from current good/bad tables
  const buildFileFromCurrent = async (mode: 'good'|'bad'): Promise<File | null> => {
    const { utils, write } = await import('xlsx');
    const wb = utils.book_new();
    const isGood = mode === 'good';
    const rows = isGood ? good : bad;
    const header = isGood
      ? ['sheet','row','matiere','cours','question n','cas n','texte du cas','texte de la question','reponse','option a','option b','option c','option d','option e','explication','explication a','explication b','explication c','explication d','explication e','image','niveau','semestre']
      : ['sheet','row','reason','matiere','cours','question n','cas n','texte du cas','texte de la question','reponse','option a','option b','option c','option d','option e','explication','image'];
    const dataObjects = rows.map((r: any) => {
      const rec = isGood ? r.data : r.original;
      const base: any = {
        sheet: r.sheet,
        row: r.row,
        ...(isGood ? {} : { reason: r.reason }),
        matiere: rec['matiere'] ?? '',
        cours: rec['cours'] ?? '',
        'question n': rec['question n'] ?? '',
        'cas n': rec['cas n'] ?? '',
        'texte du cas': rec['texte du cas'] ?? '',
        'texte de la question': rec['texte de la question'] ?? '',
        reponse: rec['reponse'] ?? '',
        'option a': rec['option a'] ?? '',
        'option b': rec['option b'] ?? '',
        'option c': rec['option c'] ?? '',
        'option d': rec['option d'] ?? '',
        'option e': rec['option e'] ?? '',
        explication: rec['explication'] ?? '',
        'explication a': rec['explication a'] ?? '',
        'explication b': rec['explication b'] ?? '',
        'explication c': rec['explication c'] ?? '',
        'explication d': rec['explication d'] ?? '',
        'explication e': rec['explication e'] ?? '',
        image: rec['image'] ?? ''
      };
      if (isGood) {
        base['niveau'] = rec['niveau'] ?? '';
        base['semestre'] = rec['semestre'] ?? '';
      }
      return base;
    });
    const ws = utils.json_to_sheet(dataObjects, { header });
    utils.book_append_sheet(wb, ws, isGood ? 'Valide' : 'Erreurs');
    const buf = write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    return new File([buf], `validation_${mode}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  const sendGoodToImport = async () => {
    setImportLogs([]);
    setImportLogs(prev => [...prev, '📦 Préparation du fichier pour import…']);
    const f = await buildImportFileFromGood();
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    const res = await fetch('/api/questions/bulk-import-progress', { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    if (json?.importId) {
      setLastImportId(json.importId);
      setImportLogs(prev => [...prev, `🚀 Import démarré (ID: ${json.importId})`]);
    } else {
      setImportLogs(prev => [...prev, '❌ Impossible de démarrer l\'import']);
    }
  };

  const aiAssist = async () => {
    if (!aiUploadFile && !bad.length) return;
    setAiBusy(true);
    try {
      setAiLogs([]);
      setAiProgress(5);
      setAiLogs(prev => [...prev, aiUploadFile ? `📄 Fichier IA: ${aiUploadFile.name}` : '🧩 Construction du fichier erreurs…']);
      const fd = new FormData();
      if (aiUploadFile) {
        fd.append('file', aiUploadFile);
      } else {
        const badFile = await buildFileFromCurrent('bad');
        if (!badFile) return; fd.append('file', badFile);
      }
      if (aiInstructions.trim()) { fd.append('instructions', aiInstructions.trim()); setAiLogs(prev => [...prev, '📝 Instructions ajoutées']); }
      setAiLogs(prev => [...prev, '📡 Envoi à l’IA…']);
      setAiProgress(15);
      // Start AI session (background) and subscribe to SSE for live progress
      const startRes = await fetch('/api/validation/ai-progress', { method: 'POST', body: fd });
      const startJson = await startRes.json().catch(() => ({}));
      if (!startRes.ok || !startJson?.aiId) {
        setAiLogs(prev => [...prev, '❌ Échec démarrage IA']);
        return;
      }
      const aiId = startJson.aiId as string;
      const ev = new EventSource(`/api/validation/ai-progress?aiId=${encodeURIComponent(aiId)}`);
      ev.onmessage = async (e) => {
        try {
          const data = JSON.parse(e.data);
          if (typeof data?.progress === 'number') setAiProgress(data.progress);
          if (Array.isArray(data?.logs)) setAiLogs(data.logs);
          // Try to parse summary from the last log line
          const last = (data?.logs || []).slice(-1)[0] as string | undefined;
          if (last && /Corrigés:\s*(\d+)/.test(last)) {
            const m1 = last.match(/Corrigés:\s*(\d+)/);
            const m2 = last.match(/Restent en erreur:\s*(\d+)/);
            setAiSummary({ fixed: m1 ? Number(m1[1]) : undefined, errors: m2 ? Number(m2[1]) : undefined });
          }
          if (data?.phase === 'complete') {
            ev.close();
            setAiLogs(prev => [...prev, '📥 Téléchargement du fichier IA…']);
            const dl = await fetch(`/api/validation/ai-progress?aiId=${encodeURIComponent(aiId)}&action=download`);
            if (dl.ok) {
              const blob = await dl.blob();
              const f = new File([blob], 'ai_fixed.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              setAiFile(f);
              setAiPreview(null);
              setAiProgress(100);
              setAiLogs(prev => [...prev, '✅ IA terminée: fichier prêt']);
            } else {
              setAiLogs(prev => [...prev, '❌ Échec du téléchargement du fichier IA']);
            }
          }
          if (data?.phase === 'error') {
            ev.close();
            setAiLogs(prev => [...prev, `❌ Erreur IA: ${data?.error || 'inconnue'}`]);
          }
        } catch {}
      };
    } finally { setAiBusy(false); }
  };

  const revalidateFixed = async () => {
    if (!aiFile) return;
    const fd = new FormData();
    fd.append('file', aiFile);
    setLoading(true);
    try {
      const res = await fetch('/api/validation', { method: 'POST', body: fd });
      const json = await res.json();
      setGood(json.good || []);
      setBad(json.bad || []);
    } finally { setLoading(false); }
  };

  const downloadAiFile = () => {
    if (!aiFile) return;
    const url = URL.createObjectURL(aiFile);
    const a = document.createElement('a');
    a.href = url; a.download = aiFile.name; a.click();
    URL.revokeObjectURL(url);
  };

  const sendAiFileToImport = async () => {
    if (!aiFile) return;
    // Redirect admin to the dedicated import page to upload the AI file manually (keeps single flow)
    window.location.href = '/admin/import';
  };

  const previewAiFile = async () => {
    const f = aiFile || aiUploadFile;
    if (!f) return;
    const { read, utils } = await import('xlsx');
    const buf = await f.arrayBuffer();
    const wb = read(buf);
    const firstSheetName = Object.keys(wb.Sheets)[0];
    if (!firstSheetName) return;
    const ws = wb.Sheets[firstSheetName];
    const data = utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (!data.length) return;
    const header = (data[0] as any[]).map(v => String(v ?? ''));
  const rows = data.slice(1);
    setAiPreview({ sheet: firstSheetName, header, rows });
  };

  // Build an import-ready workbook from good rows, split into canonical sheets
  const buildImportFileFromGood = async (): Promise<File | null> => {
    if (!good.length) return null;
    const { utils, write } = await import('xlsx');
    const wb = utils.book_new();
    const bySheet: Record<'qcm'|'qroc'|'cas_qcm'|'cas_qroc', any[]> = { qcm: [], qroc: [], cas_qcm: [], cas_qroc: [] };
    for (const r of good) {
      const rec = r.data || {};
      const sheet = r.sheet as 'qcm'|'qroc'|'cas_qcm'|'cas_qroc';
      const base: any = {
        matiere: rec['matiere'] ?? '',
        cours: rec['cours'] ?? '',
        'question n': rec['question n'] ?? '',
        'texte de la question': rec['texte de la question'] ?? '',
        reponse: rec['reponse'] ?? '',
        'option a': rec['option a'] ?? '',
        'option b': rec['option b'] ?? '',
        'option c': rec['option c'] ?? '',
        'option d': rec['option d'] ?? '',
        'option e': rec['option e'] ?? '',
        explication: rec['explication'] ?? '',
        'explication a': rec['explication a'] ?? '',
        'explication b': rec['explication b'] ?? '',
        'explication c': rec['explication c'] ?? '',
        'explication d': rec['explication d'] ?? '',
        'explication e': rec['explication e'] ?? '',
        image: rec['image'] ?? '',
        niveau: rec['niveau'] ?? '',
        semestre: rec['semestre'] ?? ''
      };
      if (sheet === 'cas_qcm' || sheet === 'cas_qroc') {
        base['cas n'] = rec['cas n'] ?? '';
        base['texte du cas'] = rec['texte du cas'] ?? '';
      }
      bySheet[sheet].push(base);
    }
    const headers: Record<string, string[]> = {
      qcm: ['matiere','cours','question n','texte de la question','reponse','option a','option b','option c','option d','option e','explication','explication a','explication b','explication c','explication d','explication e','image','niveau','semestre'],
      qroc: ['matiere','cours','question n','texte de la question','reponse','explication','image','niveau','semestre'],
      cas_qcm: ['matiere','cours','cas n','texte du cas','question n','texte de la question','reponse','option a','option b','option c','option d','option e','explication','explication a','explication b','explication c','explication d','explication e','image','niveau','semestre'],
      cas_qroc: ['matiere','cours','cas n','texte du cas','question n','texte de la question','reponse','explication','image','niveau','semestre']
    } as any;
    (['qcm','qroc','cas_qcm','cas_qroc'] as const).forEach(s => {
      const arr = bySheet[s];
      if (arr.length) {
        const ws = utils.json_to_sheet(arr, { header: headers[s] });
        utils.book_append_sheet(wb, ws, s);
      }
    });
    const buf = write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    return new File([buf], 'import_ready.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  return (
    <ProtectedRoute requireAdmin>
      <AdminRoute>
        <AdminLayout>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Validation</CardTitle>
                <CardDescription>Règles strictes: MCQ doivent avoir des lettres A–E (pas de '?' ou 'Pas de réponse') et une explication. QROC doivent avoir réponse et explication.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input type="file" accept=".xlsx" onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f); }} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={validate} disabled={!file || loading}>{loading ? 'Validation…' : 'Valider'}</Button>
                  <Button variant="outline" onClick={() => download('good')} disabled={!good.length}>Télécharger valides</Button>
                  <Button variant="outline" onClick={() => download('bad')} disabled={!bad.length}>Télécharger erreurs</Button>
                  <Button variant="secondary" onClick={sendGoodToImport} disabled={!good.length}>Envoyer valides à l’import</Button>
                  <Button variant="secondary" onClick={aiAssist} disabled={!bad.length && !aiUploadFile}>Envoyer erreurs à l’IA</Button>
                </div>
                <div className="flex gap-4">
                  <Badge variant="outline">Valides: {good.length}</Badge>
                  <Badge variant="destructive">Erreurs: {bad.length}</Badge>
                </div>
                {filterLogs.length > 0 && (
                  <div className="text-xs bg-muted/40 border rounded p-2 max-h-36 overflow-auto space-y-1">
                    {filterLogs.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assistance IA</CardTitle>
                <CardDescription>Chargez un fichier à corriger (indépendant) ou utilisez les erreurs ci-dessus. Ajoutez des instructions (optionnel).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Fichier pour l'IA (indépendant)</div>
                  <input type="file" accept=".xlsx" onChange={e => { const f = e.target.files?.[0] || null; setAiUploadFile(f); setAiPreview(null); }} />
                </div>
                <Textarea placeholder="Instructions pour l'IA (optionnel)" value={aiInstructions} onChange={e => setAiInstructions(e.target.value)} />
                {(aiBusy || aiProgress > 0) && (
                  <div className="space-y-1">
                    <Progress value={aiBusy && aiProgress < 5 ? 5 : aiProgress} />
                    <div className="text-xs text-muted-foreground">{aiLogs[aiLogs.length-1] || 'En attente…'}</div>
                    {aiSummary && (
                      <div className="text-xs text-muted-foreground">
                        {typeof aiSummary.fixed === 'number' && <span>Corrigés: {aiSummary.fixed}</span>}
                        {typeof aiSummary.errors === 'number' && <span className="ml-2">Restent en erreur: {aiSummary.errors}</span>}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={aiAssist} disabled={(!!aiUploadFile ? false : !bad.length) || aiBusy}>{aiBusy ? 'IA en cours…' : 'Corriger avec IA'}</Button>
                  <Button variant="outline" onClick={previewAiFile} disabled={!aiFile && !aiUploadFile}>Aperçu</Button>
                  <Button variant="outline" onClick={revalidateFixed} disabled={!aiFile}>Revalider les corrections</Button>
                  <Button variant="secondary" onClick={downloadAiFile} disabled={!aiFile}>Télécharger fichier IA</Button>
                  <Button variant="secondary" onClick={sendAiFileToImport} disabled={!aiFile}>Envoyer à l’import</Button>
                </div>
                <div className="text-sm text-muted-foreground">Fichier IA: {aiFile ? aiFile.name : (aiUploadFile ? aiUploadFile.name : 'aucun')}</div>
                {aiLogs.length > 0 && (
                  <div className="text-xs bg-muted/40 border rounded p-2 max-h-36 overflow-auto space-y-1">
                    {aiLogs.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}
                {aiPreview && (
                  <div className="mt-3 border rounded">
                    <div className="px-3 py-2 text-sm text-muted-foreground">Aperçu: {aiPreview.sheet} — {aiPreview.rows.length} lignes</div>
                    <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr>
                            {aiPreview.header.map((h, idx) => (
                              <th key={idx} className="px-2 py-1 text-left border-b bg-muted/30">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {aiPreview.rows.map((r, i) => (
                            <tr key={i} className="border-b">
                              {aiPreview.header.map((_, j) => (
                                <td key={j} className="px-2 py-1 whitespace-nowrap">{String(r[j] ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {(importLogs.length > 0 || lastImportId) && (
              <Card>
                <CardHeader>
                  <CardTitle>Import</CardTitle>
                  <CardDescription>Suivi des imports déclenchés depuis cette page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lastImportId && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Dernier import ID:</span>
                      <code className="px-2 py-0.5 rounded bg-muted">{lastImportId}</code>
                      <Button size="sm" variant="outline" onClick={() => window.open(`/admin/import?importId=${lastImportId}`, '_blank')}>Ouvrir le suivi</Button>
                    </div>
                  )}
                  {importLogs.length > 0 && (
                    <div className="text-xs bg-muted/40 border rounded p-2 max-h-36 overflow-auto space-y-1">
                      {importLogs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </AdminLayout>
      </AdminRoute>
    </ProtectedRoute>
  );
}
