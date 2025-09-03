"use client";

import { useState, useEffect } from 'react';
import { SessionCorrectionData, SessionCorrectionSubmission } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, Save, UploadCloud, Table as TableIcon, PenLine, CheckCircle, Loader2, Eye, EyeOff, ClipboardList, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface CorrectionZoneProps {
  sessionId: string;
  mode: 'admin' | 'maintainer' | 'student';
}

// Empty template
const emptyData: SessionCorrectionData = { tables: [], texts: [] };

export function CorrectionZone({ sessionId, mode }: CorrectionZoneProps) {
  const isEditor = mode === 'admin' || mode === 'maintainer';
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false); // still used to persist user answers, no scoring
  const [showReference, setShowReference] = useState(isEditor);
  // Preview student view toggle for editors
  const [previewStudent, setPreviewStudent] = useState(false);
  const previousRefSetting = useState<{val:boolean|null}>({ val: null })[0];
  const effectiveIsEditor = isEditor && !previewStudent; // when previewing act as student
  const [data, setData] = useState<SessionCorrectionData>(emptyData);
  const [userAnswers, setUserAnswers] = useState<SessionCorrectionSubmission['answers']>({ tables: [], texts: [] });
  // Scoring removed – we only persist answers now
  // Auto-save helpers
  const [dirty, setDirty] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/sessions/${sessionId}/correction?withSubmission=1`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            if (json.correction?.data) setData(json.correction.data as SessionCorrectionData);
            if (json.submission?.answers) setUserAnswers(json.submission.answers);
          }
        }
      } catch (e) {
        console.error('Load correction zone error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  const markDirty = () => setDirty(true);

  const togglePreview = () => {
    setPreviewStudent(p => {
      if (!p) { // entering preview
        if (previousRefSetting.val === null) previousRefSetting.val = showReference;
        // student default: don't show reference initially
        setShowReference(false);
      } else { // leaving preview
        if (previousRefSetting.val !== null) setShowReference(previousRefSetting.val);
      }
      return !p;
    });
  };

  const addTable = () => {
    setData(d => ({ ...d, tables: [...d.tables, { id: crypto.randomUUID(), title: 'QCM', headers: ['Question', 'Réponse'], rows: [['','']], compareMode: 'exact' }] }));
    markDirty();
  };
  const addText = () => {
    setData(d => ({ ...d, texts: [...d.texts, { id: crypto.randomUUID(), title: 'Question', reference: '', keywords: [], scoring: { full: 1 } }] }));
    markDirty();
  };

  // Delete functions
  const deleteTable = (tableId: string) => {
    setData(d => ({ ...d, tables: d.tables.filter(t => t.id !== tableId) }));
    markDirty();
  };
  const deleteText = (textId: string) => {
    setData(d => ({ ...d, texts: d.texts.filter(t => t.id !== textId) }));
    markDirty();
  };
  const deleteTableColumn = (tableId: string, columnIndex: number) => {
    setData(d => ({ 
      ...d, 
      tables: d.tables.map(t => t.id === tableId ? {
        ...t,
        headers: t.headers.filter((_, i) => i !== columnIndex),
        rows: t.rows.map(r => r.filter((_, i) => i !== columnIndex))
      } : t)
    }));
    markDirty();
  };
  const deleteTableRow = (tableId: string, rowIndex: number) => {
    setData(d => ({ 
      ...d, 
      tables: d.tables.map(t => t.id === tableId ? {
        ...t,
        rows: t.rows.filter((_, i) => i !== rowIndex)
      } : t)
    }));
    markDirty();
  };

  const updateTableHeader = (tableId: string, index: number, value: string) => {
    setData(d => ({ ...d, tables: d.tables.map(t => t.id === tableId ? { ...t, headers: t.headers.map((h,i)=> i===index? value : h), rows: t.rows.map(r => { const copy = [...r]; while (copy.length < t.headers.length) copy.push(''); return copy.slice(0, t.headers.length); }) } : t) }));
    markDirty();
  };
  const addTableColumn = (tableId: string) => {
    setData(d => ({ ...d, tables: d.tables.map(t => t.id === tableId ? { ...t, headers: [...t.headers, `Colonne${t.headers.length+1}`], rows: t.rows.map(r => [...r, '']) } : t) }));
    markDirty();
  };
  const addTableRow = (tableId: string) => {
    setData(d => ({ ...d, tables: d.tables.map(t => t.id === tableId ? { ...t, rows: [...t.rows, new Array(t.headers.length).fill('')] } : t) }));
    markDirty();
  };
  const updateTableCell = (tableId: string, r: number, c: number, value: string, isReference: boolean) => {
    if (isReference) {
      setData(d => ({ ...d, tables: d.tables.map(t => t.id === tableId ? { ...t, rows: t.rows.map((row, ri) => ri===r ? row.map((cell, ci) => ci===c ? value : cell) : row) } : t) }));
    } else {
      setUserAnswers(ans => {
        let table = ans.tables.find(t => t.id === tableId);
        if (!table) { table = { id: tableId, rows: [] }; ans = { ...ans, tables: [...ans.tables, table] }; }
        const rows = [...table.rows];
        if (!rows[r]) rows[r] = [];
        const row = [...rows[r]]; row[c] = value; rows[r] = row;
        const newTables = ans.tables.map(t => t.id === tableId ? { ...t, rows } : t);
        return { ...ans, tables: newTables };
      });
    }
    markDirty();
  };

  const updateTextReference = (id: string, value: string) => {
    setData(d => ({ ...d, texts: d.texts.map(t => t.id === id ? { ...t, reference: value } : t) }));
    markDirty();
  };
  const updateTextAnswer = (id: string, value: string) => {
    setUserAnswers(a => {
      const existing = a.texts.find(t => t.id === id);
      if (existing) {
        return { ...a, texts: a.texts.map(t => t.id === id ? { ...t, answer: value } : t) };
      }
      return { ...a, texts: [...a.texts, { id, answer: value }] };
    });
    markDirty();
  };

  const saveCorrection = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/sessions/${sessionId}/correction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
      if (!res.ok) throw new Error('Save failed');
      setDirty(false);
      setLastSavedAt(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Debounced auto-save for editors
  useEffect(() => {
    if (!effectiveIsEditor) return;
    if (!dirty) return;
    const handle = setTimeout(async () => {
      try {
        setAutoSaving(true);
        const res = await fetch(`/api/sessions/${sessionId}/correction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
        if (res.ok) {
          setDirty(false);
          setLastSavedAt(new Date());
        }
      } catch (e) {
        console.error('Auto-save failed', e);
      } finally {
        setAutoSaving(false);
      }
    }, 1500);
    return () => clearTimeout(handle);
  }, [dirty, data, effectiveIsEditor, sessionId]);

  const submitAnswers = async () => {
    try {
      setSubmitting(true);
      await fetch(`/api/sessions/${sessionId}/correction`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: userAnswers }) });
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-400/40 via-blue-600/10 to-blue-400/40" />
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Zone de Correction</span>
            {effectiveIsEditor && <span className="text-xs font-normal text-muted-foreground bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-md hidden sm:inline">(éditeur)</span>}
            {isEditor && previewStudent && (
              <span className="text-[10px] font-medium bg-amber-200/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-md">Vue étudiant</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex gap-2 flex-wrap items-center justify-center sm:justify-start">
            {isEditor && !previewStudent && (
              <>
                <Button size="sm" variant="outline" onClick={addTable} className="gap-2 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 min-w-[100px]">
                  <ClipboardList className="h-4 w-4" /> 
                  <span className="hidden sm:inline">Ajouter</span> QCM
                </Button>
                <Button size="sm" variant="outline" onClick={addText} className="gap-2 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 min-w-[100px]">
                  <PenLine className="h-4 w-4" /> 
                  <span className="hidden sm:inline">Ajouter</span> Texte
                </Button>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveCorrection} disabled={saving || autoSaving} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] disabled:opacity-70">
                    {(saving || autoSaving) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                    {(saving || autoSaving) ? 'Sauvegarde…' : 'Sauvegarder'}
                  </Button>
                  {lastSavedAt && !dirty && !saving && !autoSaving && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-300 font-medium">Sauvegardé {lastSavedAt.toLocaleTimeString()}</span>
                  )}
                  {dirty && !saving && !autoSaving && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Modifications non sauvegardées…</span>
                  )}
                </div>
              </>
            )}
            {!effectiveIsEditor && data && (
              <Button size="sm" variant="outline" onClick={() => setShowReference(r=>!r)} className="gap-2 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 min-w-[100px]">
                {showReference ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showReference ? 'Masquer' : 'Voir'}
              </Button>
            )}
            {isEditor && (
              <Button size="sm" variant="outline" onClick={togglePreview} className="gap-2 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 min-w-[120px]">
                {previewStudent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {previewStudent ? 'Quitter vue étudiant' : 'Vue étudiant'}
              </Button>
            )}
          </div>

          {/* Scoring UI removed */}
        </CardContent>
      </Card>

      {/* Tables */}
      {data.tables.map(table => {
    const userTable = userAnswers.tables.find(t => t.id === table.id);
        return (
          <Card key={table.id} className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg border-dashed border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3 space-y-3 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-200 min-w-0 flex-1">
                  <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <Input
                    value={table.title || ''}
          disabled={!effectiveIsEditor}
                    onChange={e => setData(d => ({ ...d, tables: d.tables.map(t => t.id === table.id ? { ...t, title: e.target.value } : t) }))}
                    placeholder="Titre du QCM"
                    className="h-8 min-w-0 flex-1 max-w-sm bg-white/70 dark:bg-muted/40 border-blue-200 dark:border-blue-800 focus:ring-blue-500"
                  />
                </CardTitle>
        {effectiveIsEditor && (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => addTableColumn(table.id)} className="gap-1 text-xs bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                      <Plus className="h-3 w-3" />
                      Colonne
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addTableRow(table.id)} className="gap-1 text-xs bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                      <Plus className="h-3 w-3" />
                      Ligne
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteTable(table.id)} className="gap-1 text-xs bg-red-500 hover:bg-red-600 text-white">
                      <Trash2 className="h-3 w-3" />
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-w-full">
                <div className="p-4 min-w-max">
                  <table className="table-auto text-sm border-collapse">
                    <thead>
                      <tr>
                        {effectiveIsEditor && <th className="border border-blue-200 dark:border-blue-800 w-8 bg-blue-50 dark:bg-blue-900/30"></th>}
                        {table.headers.map((h,i) => (
                          <th key={i} className="border border-blue-200 dark:border-blue-800 px-2 py-2 bg-blue-50 dark:bg-blue-900/30 min-w-[80px] max-w-[150px] w-auto relative">
                            {isEditor ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Input 
                                    value={h} 
                                    onChange={e => updateTableHeader(table.id, i, e.target.value)} 
                                    className="h-7 text-xs bg-white/80 dark:bg-muted/40 border-blue-200 dark:border-blue-800 focus:ring-blue-500 min-w-0 flex-1" 
                                    placeholder="En-tête"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteTableColumn(table.id, i)}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                                    title="Supprimer cette colonne"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <span className="font-medium text-blue-800 dark:text-blue-200 text-center block text-xs">{h}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, ri) => (
                        <tr key={ri}>
                          {effectiveIsEditor && (
                            <td className="border border-blue-200 dark:border-blue-800 w-8 bg-gray-50 dark:bg-gray-800/30 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteTableRow(table.id, ri)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                                title="Supprimer cette ligne"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </td>
                          )}
                          {row.map((cell, ci) => {
                            const headerLabel = table.headers[ci] || '';
                            const isQuestionCol = ci === 0 || /question/i.test(headerLabel);
                            const userVal = userTable?.rows?.[ri]?.[ci] || '';
                            const showRef = showReference || effectiveIsEditor;
                            // For students: Question column always shows reference (cell) and is locked.
                            if (!effectiveIsEditor && isQuestionCol) {
                              return (
                                <td key={ci} className="border border-blue-200 dark:border-blue-800 px-1 py-1 align-top bg-white/60 dark:bg-muted/20 min-w-[140px] max-w-[240px] w-auto">
                                  <div className="text-[11px] sm:text-xs text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                                    {cell || ''}
                                  </div>
                                </td>
                              );
                            }
                            const isEditable = effectiveIsEditor || !showRef; // unchanged logic for other columns
                            const displayVal = showRef ? cell : userVal;
                            // Highlight correctness in student (or preview) mode only for non-question columns
                            let highlightClass = '';
                            // Show correctness colors only after user clicks "Voir" (showReference true)
                            if (!effectiveIsEditor && !isQuestionCol && showReference) {
                              const refVal = cell?.trim();
                              const studVal = (userVal || '').trim();
                              if (studVal) {
                                if (refVal && studVal.toLowerCase() === refVal.toLowerCase()) {
                                  highlightClass = 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
                                } else if (refVal) {
                                  highlightClass = 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
                                }
                              }
                            }
                            return (
                              <td key={ci} className={cn('border px-1 py-1 align-top bg-white/60 dark:bg-muted/20 min-w-[80px] max-w-[150px] w-auto border-blue-200 dark:border-blue-800', highlightClass)}>
                                <Input
                                  value={isEditable ? (showRef ? (isEditor ? cell : userVal) : userVal) : displayVal}
                                  readOnly={!isEditable}
                                  onChange={e => updateTableCell(table.id, ri, ci, e.target.value, showRef && effectiveIsEditor)}
                                  className="h-7 text-xs bg-white/80 dark:bg-muted/40 border-0 focus:ring-1 focus:ring-blue-500 w-full min-w-0"
                                  placeholder={isEditor ? (isQuestionCol ? 'Question' : 'Valeur') : 'Votre réponse'}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Text blocks */}
      {data.texts.map(txt => {
        const userTxt = userAnswers.texts.find(t => t.id === txt.id);
        return (
          <Card key={txt.id} className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg border-dashed border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3 px-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-200 min-w-0 flex-1">
                  <PenLine className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <Input
                    value={txt.title || ''}
                    disabled={!effectiveIsEditor}
                    onChange={e => setData(d => ({ ...d, texts: d.texts.map(t => t.id === txt.id ? { ...t, title: e.target.value } : t) }))}
                    placeholder="Titre de la zone"
                    className="h-8 min-w-0 flex-1 max-w-sm bg-white/70 dark:bg-muted/40 border-blue-200 dark:border-blue-800 focus:ring-blue-500"
                  />
                </CardTitle>
                {effectiveIsEditor && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteText(txt.id)}
                    className="gap-1 text-xs bg-red-500 hover:bg-red-600 text-white flex-shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                    Supprimer
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 sm:px-6">
      {showReference || effectiveIsEditor ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-blue-700 dark:text-blue-300">Réponse de référence</label>
                  <Textarea
                    value={txt.reference}
        onChange={e => updateTextReference(txt.id, e.target.value)}
        readOnly={!effectiveIsEditor}
                    placeholder="Réponse officielle"
                    rows={4}
                    className="bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Votre réponse</label>
                  <Textarea
                    value={userTxt?.answer || ''}
                    onChange={e => updateTextAnswer(txt.id, e.target.value)}
                    placeholder="Votre réponse"
                    rows={4}
                    className="bg-white/70 dark:bg-muted/40 border-blue-200 dark:border-blue-800 focus:ring-blue-500"
                  />
                </div>
              )}
      {!effectiveIsEditor && showReference && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Votre réponse</label>
                  <Textarea
                    value={userTxt?.answer || ''}
                    onChange={e => updateTextAnswer(txt.id, e.target.value)}
                    placeholder="Votre réponse"
                    rows={4}
                    className="bg-white/70 dark:bg-muted/40 border-blue-200 dark:border-blue-800 focus:ring-blue-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

  {!effectiveIsEditor && (data.tables.length > 0 || data.texts.length > 0) && (
        <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg">
          <CardContent className="pt-4 pb-4 px-4 sm:px-6">
            <div className="flex justify-center">
              <Button size="sm" onClick={submitAnswers} disabled={submitting} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 w-full sm:w-auto min-w-[160px]">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} 
                <span>Enregistrer Réponses</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && data.tables.length === 0 && data.texts.length === 0 && (
        <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg border-dashed border-blue-200 dark:border-blue-800">
          <CardContent className="py-8 sm:py-12 text-center px-4 sm:px-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {effectiveIsEditor ? 'Aucune correction créée. Ajoutez des QCM ou des zones de texte.' : 'Aucune correction disponible pour cette session.'}
            </p>
            {effectiveIsEditor && (
              <div className="flex gap-2 justify-center flex-wrap">
                <Button size="sm" variant="outline" onClick={addTable} className="gap-2 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 min-w-[120px]">
                  <ClipboardList className="h-4 w-4" /> Ajouter QCM
                </Button>
                <Button size="sm" variant="outline" onClick={addText} className="gap-2 bg-white/70 dark:bg-muted/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 min-w-[120px]">
                  <PenLine className="h-4 w-4" /> Ajouter Texte
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
