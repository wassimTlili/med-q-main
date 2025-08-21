'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Lecture, Question } from '@/types';
import { GripVertical, Save, Undo2 } from 'lucide-react';

type QType = 'mcq' | 'qroc' | 'clinic_mcq' | 'clinic_croq';

interface OrganizerProps {
  lecture: Lecture;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface DnDItem {
  id: string;
  type: QType;
}

export function QuestionOrganizerDialog({ lecture, isOpen, onOpenChange, onSaved }: OrganizerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);

  // columns state
  const [columns, setColumns] = useState<Record<QType, Question[]>>({
    mcq: [],
    qroc: [],
    clinic_mcq: [],
    clinic_croq: [],
  });

  const dragItem = useRef<DnDItem | null>(null);
  const overId = useRef<string | null>(null);
  const overType = useRef<QType | null>(null);
  const overAfter = useRef<boolean>(false); // whether pointer is in bottom half of hovered item

  useEffect(() => {
    if (!isOpen) return;
    fetchQuestions();
  }, [isOpen, lecture.id]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/questions?lectureId=${lecture.id}`);
      if (!res.ok) throw new Error('Failed to load questions');
      const data: Question[] = await res.json();
      // Normalize and sort each column by number to get deterministic order
      const sortByNumber = (a: Question, b: Question) => {
        const an = a.number ?? Number.MAX_SAFE_INTEGER;
        const bn = b.number ?? Number.MAX_SAFE_INTEGER;
        if (an !== bn) return an - bn;
        return a.id.localeCompare(b.id);
      };
      const mcq = data.filter(q => q.type === 'mcq').sort(sortByNumber).map((q, i) => ({ ...q, number: q.number ?? i + 1 }));
      const qroc = data.filter(q => q.type === 'qroc').sort(sortByNumber).map((q, i) => ({ ...q, number: q.number ?? i + 1 }));
      const clinic_mcq = data.filter(q => q.type === 'clinic_mcq').sort(sortByNumber).map((q, i) => ({ ...q, number: q.number ?? i + 1 }));
      const clinic_croq = data.filter(q => q.type === 'clinic_croq').sort(sortByNumber).map((q, i) => ({ ...q, number: q.number ?? i + 1 }));
      setQuestions(data);
      setColumns({ mcq, qroc, clinic_mcq, clinic_croq });
  setDirty(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', description: "Chargement des questions impossible.", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const originalColumns = useMemo(() => {
    const sortByNumber = (a: Question, b: Question) => {
      const an = a.number ?? Number.MAX_SAFE_INTEGER;
      const bn = b.number ?? Number.MAX_SAFE_INTEGER;
      if (an !== bn) return an - bn;
      return a.id.localeCompare(b.id);
    };
    return {
      mcq: [...questions.filter(q => q.type === 'mcq')].sort(sortByNumber),
      qroc: [...questions.filter(q => q.type === 'qroc')].sort(sortByNumber),
      clinic_mcq: [...questions.filter(q => q.type === 'clinic_mcq')].sort(sortByNumber),
      clinic_croq: [...questions.filter(q => q.type === 'clinic_croq')].sort(sortByNumber),
    } as Record<QType, Question[]>;
  }, [questions]);

  const hasChanges = useMemo(() => {
    const sameOrder = (a: Question[], b: Question[]) => a.length === b.length && a.every((q, i) => q.id === b[i].id);
    return !(
      sameOrder(columns.mcq, originalColumns.mcq) &&
      sameOrder(columns.qroc, originalColumns.qroc) &&
      sameOrder(columns.clinic_mcq, originalColumns.clinic_mcq) &&
      sameOrder(columns.clinic_croq, originalColumns.clinic_croq)
    );
  }, [columns, originalColumns]);

  const onDragStart = (q: Question) => (e: React.DragEvent) => {
    dragItem.current = { id: q.id, type: q.type as QType };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', q.id);
  };

  const onDragOverColumn = (type: QType) => (e: React.DragEvent) => {
    e.preventDefault();
    // Mark the active column but do NOT clear last hovered item.
    // Clearing it forces drops to append at end; we want to keep last precise target.
    overType.current = type;
    // If the column is empty, ensure we drop at end (which is also start)
    try {
      // columns from closure is safe here
      const hasItems = (columns[type] || []).length > 0;
      if (!hasItems) overId.current = null;
    } catch {}
  };

  const onDragOverItem = (type: QType, id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    overType.current = type;
    overId.current = id; // target this item
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    overAfter.current = e.clientY > midpoint; // true => drop after this item
  };

  // Stabilize target on drag enter as well (helps when dragover fires on container afterwards)
  const onDragEnterItem = (type: QType, id: string) => (e: React.DragEvent) => {
    overType.current = type;
    overId.current = id;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    overAfter.current = e.clientY > midpoint;
  };

  const onDrop = () => {
    if (!dragItem.current || !overType.current) return;
    const { id } = dragItem.current;
    const targetType = overType.current;
  const targetId = overId.current;

    setColumns(prev => {
      // remove from any column first
      const next: Record<QType, Question[]> = {
        mcq: [...prev.mcq],
        qroc: [...prev.qroc],
        clinic_mcq: [...prev.clinic_mcq],
        clinic_croq: [...prev.clinic_croq],
      };

      let moving: Question | undefined;
      (Object.keys(next) as QType[]).forEach(t => {
        const idx = next[t].findIndex(q => q.id === id);
        if (idx >= 0) {
          moving = { ...next[t][idx] };
          next[t].splice(idx, 1);
        }
      });

      if (!moving) return prev;
      // update type when moving to different column
      moving.type = targetType;

  const col = next[targetType];
  let insertAt = targetId ? col.findIndex(q => q.id === targetId) : col.length; // default end if no target
  if (insertAt < 0) insertAt = col.length;
  // If pointer is in bottom half, insert after the target
  if (targetId && overAfter.current) insertAt = Math.min(insertAt + 1, col.length);
  col.splice(insertAt, 0, moving);
      // re-number within each column (1..n) visually
      (Object.keys(next) as QType[]).forEach(t => {
        next[t] = next[t].map((q, i) => ({ ...q, number: i + 1 }));
      });
      return next;
    });

    // reset refs
    dragItem.current = null;
    overType.current = null;
  overId.current = null;
  overAfter.current = false;
  setDirty(true);
  };

  const revert = () => {
    setColumns({
      mcq: questions.filter(q => q.type === 'mcq'),
      qroc: questions.filter(q => q.type === 'qroc'),
      clinic_mcq: questions.filter(q => q.type === 'clinic_mcq'),
      clinic_croq: questions.filter(q => q.type === 'clinic_croq'),
    });
  setDirty(false);
  };

  const save = async () => {
    try {
      setSaving(true);
  const tasks: Array<Promise<Response>> = [];
  const origById = new Map(questions.map(q => [q.id, q] as const));

      const pushUpdates = (type: QType, arr: Question[]) => {
        arr.forEach((q, idx) => {
          const newNumber = idx + 1;
          const orig = origById.get(q.id);
          const changes: Partial<Question> = {};
          let changed = false;
          if ((orig?.type as QType | undefined) !== type) { changes.type = type; changed = true; }
          if ((orig?.number ?? null) !== newNumber) { changes.number = newNumber as any; changed = true; }
          if (!changed) return;

          // Preserve or clear correctAnswers depending on type transition
          const origType = (orig?.type || q.type) as QType;
          const isTargetMCQ = type === 'mcq' || type === 'clinic_mcq';
          const isTargetQROC = type === 'qroc' || type === 'clinic_croq';
          const wasMCQ = origType === 'mcq' || origType === 'clinic_mcq';
          const wasQROC = origType === 'qroc' || origType === 'clinic_croq';
          let nextCorrect: string[] = Array.isArray(q.correctAnswers)
            ? (q.correctAnswers as string[])
            : (Array.isArray((q as any).correct_answers) ? (q as any).correct_answers : []);
          if (isTargetMCQ && wasQROC) {
            // moving from QROC to MCQ: clear answers (MCQ expects option IDs)
            nextCorrect = [];
          } else if (isTargetQROC && wasMCQ) {
            // moving from MCQ to QROC: clear MCQ option IDs
            nextCorrect = [];
          }

          const payload: any = {
            id: q.id,
            lectureId: lecture.id,
            type,
            text: q.text,
            options: q.options ?? null,
            correctAnswers: nextCorrect,
            explanation: q.explanation ?? null,
            courseReminder: (q as any).courseReminder ?? (q as any).course_reminder ?? null,
            number: newNumber,
            session: q.session ?? null,
            mediaUrl: (q as any).mediaUrl ?? (q as any).media_url ?? null,
            mediaType: (q as any).mediaType ?? (q as any).media_type ?? null,
            courseReminderMediaUrl: (q as any).courseReminderMediaUrl ?? (q as any).course_reminder_media_url ?? null,
            courseReminderMediaType: (q as any).courseReminderMediaType ?? (q as any).course_reminder_media_type ?? null,
            // If moving to non-clinical type, clear case fields
            caseNumber: (type === 'clinic_mcq' || type === 'clinic_croq')
              ? ((q as any).caseNumber ?? (q as any).case_number ?? null)
              : null,
            caseText: (type === 'clinic_mcq' || type === 'clinic_croq')
              ? ((q as any).caseText ?? (q as any).case_text ?? null)
              : null,
            caseQuestionNumber: (type === 'clinic_mcq' || type === 'clinic_croq')
              ? ((q as any).caseQuestionNumber ?? (q as any).case_question_number ?? null)
              : null,
          };

          tasks.push(fetch('/api/questions', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }));
        });
      };

      pushUpdates('mcq', columns.mcq);
      pushUpdates('qroc', columns.qroc);
      pushUpdates('clinic_mcq', columns.clinic_mcq);
      pushUpdates('clinic_croq', columns.clinic_croq);

      const results = await Promise.all(tasks);
      const failed = results.filter(r => !r.ok);
      if (failed.length) {
        const first = failed[0];
        let msg = 'Sauvegarde partielle. Certaines mises à jour ont échoué.';
        try { const j = await first.json(); msg = j.error || msg; } catch {}
        throw new Error(msg);
      }

  toast({ title: 'Ordre enregistré', description: 'La réorganisation a été sauvegardée.' });
      if (onSaved) onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : "Échec de la sauvegarde.", variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filterText = (q: Question) => q.text?.toLowerCase().includes(search.toLowerCase());

  const Column: React.FC<{ title: string; type: QType; items: Question[] }> = ({ title, type, items }) => {
    const display = search.trim() ? items.filter(filterText) : items;
    return (
      <div className="flex-1 min-w-[260px]">
        <Card onDragOver={onDragOverColumn(type)} onDrop={onDrop}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{title}</span>
              <span className="text-xs text-muted-foreground">{display.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {display.map((q, idx) => (
              <div
                key={q.id}
                className="p-2 rounded-md border bg-card hover:bg-muted/50 cursor-move flex items-start gap-2"
                draggable
                onDragStart={onDragStart(q)}
                onDragOver={onDragOverItem(type, q.id)}
                onDragEnter={onDragEnterItem(type, q.id)}
                onDrop={onDrop}
              >
                <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">#{idx + 1}</div>
                  <div className="text-sm line-clamp-2">{q.text}</div>
                </div>
              </div>
            ))}
            {display.length === 0 && (
              <div className="text-xs text-muted-foreground py-6 text-center">Aucune question</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between w-full">
            <span>Organiser les questions – {lecture.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 pb-2 flex items-center gap-3">
          <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={revert} disabled={(!hasChanges && !dirty) || saving}>
              <Undo2 className="h-4 w-4 mr-1" /> Réinitialiser
            </Button>
            <Button onClick={save} disabled={(!hasChanges && !dirty) || saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 pt-2">
          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Column title="QCM" type="mcq" items={columns.mcq} />
              <Column title="QROC" type="qroc" items={columns.qroc} />
              <Column title="CAS QCM" type="clinic_mcq" items={columns.clinic_mcq} />
              <Column title="CAS QROC" type="clinic_croq" items={columns.clinic_croq} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
