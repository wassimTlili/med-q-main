"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>('idle');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const startImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/questions/bulk-import-progress', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.importId) throw new Error('No importId');
      setImportId(json.importId);
      setPhase('validating');
      setMessage('Import started');
    } catch (e: any) {
      setMessage(e?.message || 'Import failed to start');
    } finally { setBusy(false); }
  };

  useEffect(() => {
    // Pick up importId from URL if provided
    const params = new URLSearchParams(window.location.search);
    const id = params.get('importId');
    if (id) setImportId(id);
  }, []);

  useEffect(() => {
    if (!importId) return;
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    const url = new URL('/api/questions/bulk-import-progress', window.location.origin);
    url.searchParams.set('importId', importId);
    const es = new EventSource(url.toString(), { withCredentials: true });
    esRef.current = es;
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        setProgress(data.progress || 0);
        setPhase(data.phase || '');
        setMessage(data.message || '');
        setStats(data.stats || null);
      } catch {}
    };
    es.onerror = () => {
      // silently ignore; server will close when complete
    };
    return () => { es.close(); };
  }, [importId]);

  const downloadErrors = (fmt: 'csv'|'xlsx') => {
    if (!importId) return;
    const url = new URL('/api/questions/bulk-import-progress', window.location.origin);
    url.searchParams.set('importId', importId);
    url.searchParams.set('action', fmt === 'csv' ? 'downloadErrors' : 'downloadErrorsXlsx');
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import</CardTitle>
          <CardDescription>Importer un fichier .xlsx (qcm, qroc, cas_qcm, cas_qroc). L'import est annulé si une ligne échoue la validation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {importId && (
            <div className="text-sm text-muted-foreground">Suivi de l'import en cours: <code className="bg-muted px-1 py-0.5 rounded">{importId}</code></div>
          )}
          <input type="file" accept=".xlsx" onChange={e => setFile(e.target.files?.[0] || null)} />
          <div className="flex gap-2">
            <Button onClick={startImport} disabled={!file || busy}>{busy ? 'Démarrage…' : 'Démarrer l\'import'}</Button>
            {stats?.failed > 0 && (
              <>
                <Button variant="outline" onClick={() => downloadErrors('csv')}>Télécharger erreurs (CSV)</Button>
                <Button variant="outline" onClick={() => downloadErrors('xlsx')}>Télécharger erreurs (XLSX)</Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="outline">Progression: {progress}%</Badge>
            <Badge variant={phase === 'complete' ? 'default' : 'outline'}>Phase: {phase}</Badge>
            {stats && (
              <span className="text-muted-foreground">Total: {stats.total} • Importés: {stats.imported} • Échecs: {stats.failed}</span>
            )}
          </div>
          {message && <div className="text-sm text-muted-foreground">{message}</div>}
          <div className="text-xs text-muted-foreground">Astuce: validez d'abord sur /validation pour isoler les erreurs, puis importez ici.</div>
        </CardContent>
      </Card>
    </div>
  );
}
