'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, RefreshCcw, PlusCircle, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface SessionItem {
  id: string;
  name: string;
  pdfUrl?: string | null;
  correctionUrl?: string | null;
  niveau?: { id: string; name: string } | null;
  semester?: { id: string; name: string; order: number } | null;
  specialty?: { id: string; name: string } | null;
  niveauId?: string | null;
  semesterId?: string | null;
  specialtyId?: string | null;
  createdAt: string;
}

export default function SessionsAdminPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; pdfUrl: string; correctionUrl: string; niveauId: string; semester: string; specialtyName: string }>({ name: '', pdfUrl: '', correctionUrl: '', niveauId: '', semester: '', specialtyName: '' });
  const [niveaux, setNiveaux] = useState<{ id: string; name: string }[]>([]);
  const [semesters, setSemesters] = useState<{ id: string; name: string; order: number; niveauId: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sessionsRes, niveauxRes, semestersRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/niveaux'),
        fetch('/api/semesters')
      ]);
      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (niveauxRes.ok) setNiveaux(await niveauxRes.json());
      if (semestersRes.ok) setSemesters(await semestersRes.json());
    } catch {
      toast({ title: 'Erreur', description: 'Chargement impossible', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: '', pdfUrl: '', correctionUrl: '', niveauId: '', semester: '', specialtyName: '' });

  const handleCreate = async () => {
    if (!form.name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, pdfUrl: form.pdfUrl || undefined, correctionUrl: form.correctionUrl || undefined, niveauId: form.niveauId || undefined, semester: form.semester || undefined, specialtyName: form.specialtyName || undefined }) });
      if (!res.ok) {
        const txt = await res.text();
        toast({ title: 'Échec création', description: txt, variant: 'destructive' });
        return;
      }
      resetForm();
      toast({ title: 'Session créée', description: form.name });
      load();
    } finally { setCreating(false); }
  };

  const startEdit = (s: SessionItem) => {
    setEditingId(s.id);
    setShowForm(true);
    setForm({ name: s.name, pdfUrl: s.pdfUrl || '', correctionUrl: s.correctionUrl || '', niveauId: s.niveau?.id || '', semester: s.semester ? String(s.semester.order) : '', specialtyName: s.specialty?.name || '' });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const res = await fetch(`/api/sessions/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, pdfUrl: form.pdfUrl || undefined, correctionUrl: form.correctionUrl || undefined, niveauId: form.niveauId || undefined, semesterId: undefined, semester: form.semester || undefined, specialtyName: form.specialtyName || undefined }) });
    if (!res.ok) {
      const txt = await res.text();
      toast({ title: 'Échec modification', description: txt, variant: 'destructive' });
      return;
    }
    toast({ title: 'Session mise à jour', description: form.name });
    setEditingId(null);
    resetForm();
    load();
  };

  const confirmDeleteSession = (s: SessionItem) => setConfirmDelete({ id: s.id, name: s.name });
  const handleDelete = async () => {
    if (!confirmDelete) return;
    const res = await fetch(`/api/sessions/${confirmDelete.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast({ title: 'Échec suppression', description: await res.text(), variant: 'destructive' });
      return;
    }
    toast({ title: 'Session supprimée', description: confirmDelete.name });
    setConfirmDelete(null);
    load();
  };

  return (
    <ProtectedRoute requireAdmin>
      <AdminRoute>
        <AdminLayout>
          <div className="space-y-8">
            <div className="flex flex-wrap gap-4 justify-between items-start">
              <div className="flex-1 min-w-[260px]">
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Gestion des sessions</h1>
                <p className="text-muted-foreground text-sm">Créer, modifier et supprimer les sessions (examens).</p>
              </div>
              <div className="flex gap-2 items-center ml-auto">
                <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="gap-2">
                  <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
                </Button>
                <Button onClick={()=> setShowForm(v=>!v)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 shadow">
                  {showForm ? <X className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                  {editingId ? 'Modifier session' : showForm ? 'Fermer' : 'Nouvelle session'}
                </Button>
              </div>
            </div>

            {showForm && (
              <Card className="border-dashed border-blue-300 bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/30 dark:to-background">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-blue-800 dark:text-blue-100">{editingId ? 'Modifier la session' : 'Créer une nouvelle session'}</CardTitle>
                  <CardDescription>{editingId ? 'Mettre à jour les informations de la session.' : 'Définir les informations de la session.'}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <Label>Nom</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                  </div>
                  <div className="space-y-1">
                    <Label>PDF (URL)</Label>
                    <Input value={form.pdfUrl} onChange={e => setForm(f => ({ ...f, pdfUrl: e.target.value }))} className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                  </div>
                  <div className="space-y-1">
                    <Label>Correction (URL)</Label>
                    <Input value={form.correctionUrl} onChange={e => setForm(f => ({ ...f, correctionUrl: e.target.value }))} className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                  </div>
                  <div className="space-y-1">
                    <Label>Niveau</Label>
                    <Select value={form.niveauId || 'none'} onValueChange={v => setForm(f => ({ ...f, niveauId: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {niveaux.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Semestre</Label>
                    <Select value={form.semester || 'none'} onValueChange={v => setForm(f => ({ ...f, semester: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {semesters.filter(s => !form.niveauId || s.niveauId === form.niveauId).map(s => <SelectItem key={s.id} value={String(s.order)}>S{s.order}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Spécialité (nom)</Label>
                    <Input value={form.specialtyName} onChange={e => setForm(f => ({ ...f, specialtyName: e.target.value }))} placeholder="Créée si inexistante" className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20" />
                  </div>
                  <div className="md:col-span-2 flex gap-2 justify-end pt-2 border-t border-blue-100">
                    {editingId && <Button variant="outline" size="sm" onClick={() => { setEditingId(null); resetForm(); }} className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30">Annuler</Button>}
                    {!editingId && <Button size="sm" onClick={handleCreate} disabled={!form.name || creating} className="bg-blue-600 hover:bg-blue-700 text-white gap-1"><Plus className="h-4 w-4" /> Créer</Button>}
                    {editingId && <Button size="sm" onClick={handleUpdate} disabled={!form.name} className="bg-blue-600 hover:bg-blue-700 text-white">Enregistrer</Button>}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Liste des sessions</CardTitle>
                  <CardDescription>Sessions existantes ({sessions.length})</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Niveau</TableHead>
                        <TableHead>Semestre</TableHead>
                        <TableHead>Spécialité</TableHead>
                        <TableHead>PDF</TableHead>
                        <TableHead>Correction</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map(s => (
                        <TableRow key={s.id} className={editingId === s.id ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.niveau?.name || '-'}</TableCell>
                          <TableCell>{s.semester ? `S${s.semester.order}` : '-'}</TableCell>
                          <TableCell>{s.specialty?.name || '-'}</TableCell>
                          <TableCell className="max-w-[140px] truncate">{s.pdfUrl ? 'Oui' : '-'}</TableCell>
                          <TableCell className="max-w-[140px] truncate">{s.correctionUrl ? 'Oui' : '-'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => startEdit(s)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="destructive" size="sm" onClick={() => confirmDeleteSession(s)}><Trash2 className="h-3 w-3" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sessions.length === 0 && !loading && (
                        <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">Aucune session</TableCell></TableRow>
                      )}
                      {loading && (
                        <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">Chargement…</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <ConfirmationDialog
              isOpen={!!confirmDelete}
              onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}
              title="Supprimer la session"
              description={`Confirmer la suppression de '${confirmDelete?.name}' ?`}
              confirmText="Supprimer"
              cancelText="Annuler"
              variant="destructive"
              onConfirm={handleDelete}
            />
          </div>
        </AdminLayout>
      </AdminRoute>
    </ProtectedRoute>
  );
}
