"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { StickyNote, CheckCircle2, Loader2, Trash2 } from 'lucide-react';

interface QuestionNotesProps {
  questionId: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function QuestionNotes({ questionId }: QuestionNotesProps) {
  const { user } = useAuth();
  const [value, setValue] = useState('');
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastSavedValueRef = useRef('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing note
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/user-question-state?userId=${user.id}&questionId=${questionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.notes === 'string') {
          setValue(data.notes);
          lastSavedValueRef.current = data.notes;
          setLastSavedAt(new Date());
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setInitialLoaded(true);
      }
    }
    setValue('');
    setInitialLoaded(false);
    setSaveState('idle');
    lastSavedValueRef.current = '';
    load();
    return () => { cancelled = true; if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [questionId, user?.id]);

  const hasChanges = useMemo(() => value !== lastSavedValueRef.current, [value]);

  const save = async (silent = false) => {
    if (!user?.id) {
      if (!silent) toast({ title: 'Sign in required', description: 'Please sign in to save notes', variant: 'destructive' });
      return;
    }
    try {
      setSaveState('saving');
      const res = await fetch('/api/user-question-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, questionId, notes: value }),
      });
      if (!res.ok) throw new Error('Failed');
      lastSavedValueRef.current = value;
      setLastSavedAt(new Date());
      setSaveState('saved');
      if (!silent) toast({ title: 'Saved', description: 'Your note has been saved.' });
      // revert to idle after a moment
      setTimeout(() => setSaveState('idle'), 1200);
    } catch {
      setSaveState('error');
      if (!silent) toast({ title: 'Error', description: 'Failed to save note', variant: 'destructive' });
    }
  };

  // Autosave on change (debounced)
  useEffect(() => {
    if (!initialLoaded) return;
    if (!hasChanges) return;
    if (!user?.id) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void save(true); }, 900);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, initialLoaded, hasChanges, user?.id]);

  const clearNote = async () => {
    setValue('');
    // Trigger immediate save of empty value silently
    await save(true);
    toast({ title: 'Cleared', description: 'Your note was cleared.' });
  };

  const status = (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {saveState === 'saving' && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>)}
      {saveState === 'saved' && (<><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Saved</>)}
      {saveState === 'error' && (<span className="text-red-600">Save failed</span>)}
      {saveState === 'idle' && lastSavedAt && !hasChanges && (
        <span>Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      )}
    </div>
  );

  return (
    <div className="mt-4">
      <div className="rounded-xl border bg-muted/30 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 text-primary grid place-items-center">
              <StickyNote className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium">My Notes</span>
          </div>
          {status}
        </div>

        <Textarea 
          value={value} 
          onChange={(e) => setValue(e.target.value)} 
          placeholder="Write your personal notes for this question…"
          className="min-h-[110px] rounded-lg bg-background/80"
        />

        <div className="mt-2 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearNote}
            disabled={!initialLoaded || (!value && !lastSavedValueRef.current)}
            className="text-muted-foreground"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
          <Button size="sm" onClick={() => save(false)} disabled={!initialLoaded || !hasChanges}>
            Save note
          </Button>
        </div>
      </div>
    </div>
  );
}
