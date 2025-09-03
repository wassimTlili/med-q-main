"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { StickyNote, CheckCircle2, Loader2, Trash2, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [images, setImages] = useState<string[]>([]); // persisted URLs
  const imagesRef = useRef<string[]>([]); // always-current images for saves
  const [pendingFiles, setPendingFiles] = useState<File[]>([]); // before upload (future integration)
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load existing note
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) { return; }
      // First try localStorage cache immediately (optimistic) while network fetch happens
      try {
        const cacheKey = `noteImages:${user.id}:${questionId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length && !cancelled) {
            setImages(parsed.slice(0,6));
          }
        }
      } catch {}
      try {
        const res = await fetch(`/api/user-question-state?userId=${user.id}&questionId=${questionId}`);
        if (!res.ok) { return; }
        const data = await res.json();
        if (cancelled) return;
        if (typeof data?.notes === 'string') {
          setValue(data.notes);
          lastSavedValueRef.current = data.notes;
          setLastSavedAt(new Date());
        }
        if (Array.isArray(data?.notesImageUrls)) {
          const serverImgs = (data.notesImageUrls as string[]).filter(x => typeof x === 'string' && x.startsWith('data:image/'));
          // Reconcile: if server returns empty but we had cached images, attempt a silent re-save to push them
          if (serverImgs.length) {
            setImages(serverImgs);
            try { if (user?.id) localStorage.setItem(`noteImages:${user.id}:${questionId}`, JSON.stringify(serverImgs)); } catch {}
          } else {
            // If server empty but cache existed (already set), schedule a silent repair save
            if (images.length) {
              setTimeout(() => { void save(true); }, 400);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setInitialLoaded(true);
      }
    }
    // reset before load
    setInitialLoaded(false);
    setSaveState('idle');
    lastSavedValueRef.current = '';
    setImages([]);
    setPendingFiles([]);
    load();
    return () => { cancelled = true; if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [questionId, user?.id]);

  const hasChanges = useMemo(() => value !== lastSavedValueRef.current, [value]);

  // Keep ref in sync so delayed saves (after selecting images) use latest list
  useEffect(() => { imagesRef.current = images; }, [images]);

  // Ensure image panel auto-opens if images present after load
  // no-op: auto open removed (always visible section)

  const save = async (silent = false, overrideImages?: string[]) => {
    if (!user?.id) {
      if (!silent) toast({ title: 'Sign in required', description: 'Please sign in to save notes', variant: 'destructive' });
      return;
    }
    try {
      setSaveState('saving');
      const res = await fetch('/api/user-question-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, questionId, notes: value, notesImageUrls: overrideImages ?? imagesRef.current }),
      });
      if (!res.ok) throw new Error('Failed');
      // Use server response as source of truth in case of any transformations
      try {
        const data = await res.json();
        if (data && Array.isArray(data.notesImageUrls)) {
          const sanitized = data.notesImageUrls.filter((x: any) => typeof x === 'string' && x.startsWith('data:image/'));
            if (sanitized.length !== imagesRef.current.length || sanitized.some((v:string,i:number)=>v!==imagesRef.current[i])) {
              setImages(sanitized.slice(0,6));
            }
            if (user?.id) localStorage.setItem(`noteImages:${user.id}:${questionId}`, JSON.stringify(sanitized.slice(0,6)));
        }
      } catch {
        // ignore JSON parse or storage errors
      }
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
    setImages([]);
    // Trigger immediate save of empty value silently
    await save(true);
    toast({ title: 'Cleared', description: 'Your note was cleared.' });
  };

  const processSelectedFiles = async (files: File[]) => {
    const filesArr = Array.from(files || []);
    const remaining = 6 - images.length;
    if (remaining <= 0) {
      toast({ title: 'Limit reached', description: 'Maximum 6 images allowed', variant: 'destructive' });
      return;
    }
    const slice = filesArr.slice(0, remaining);
    // Convert to base64 (size cap removed)
    const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    const newUrls: string[] = [];
    let skipped = 0;
    for (const f of slice) {
      try {
        const data = await toDataUrl(f);
        if (data.startsWith('data:image/')) newUrls.push(data); else skipped++;
      } catch (err) { skipped++; }
    }
    if (newUrls.length) {
      const combined = [...imagesRef.current, ...newUrls].slice(0,6);
      setImages(combined); // ref sync effect will update imagesRef
      setPendingFiles(prev => [...prev, ...slice]);
      toast({ title: 'Images added', description: `${newUrls.length} image(s) added${skipped ? `, ${skipped} skipped` : ''}` });
      try { if (user?.id) localStorage.setItem(`noteImages:${user.id}:${questionId}`, JSON.stringify(combined)); } catch {}
      // Immediate save with the combined list (no stale closure)
      void save(true, combined);
    } else if (skipped) {
      toast({ title: 'No images added', description: `${skipped} image(s) could not be processed`, variant: 'destructive' });
    }
  };

  const onSelectImages: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await processSelectedFiles(files);
  };

  const removeImage = (url: string) => {
    const updated = imagesRef.current.filter(u => u !== url);
    setImages(updated);
    try { if (user?.id) { const key = `noteImages:${user.id}:${questionId}`; localStorage.setItem(key, JSON.stringify(updated)); } } catch {}
    void save(true, updated);
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

        {initialLoaded ? (
          <Textarea 
            value={value} 
            onChange={(e) => setValue(e.target.value)} 
            placeholder="Write your personal notes for this question…"
            className="min-h-[110px] rounded-lg bg-background/80"
          />
        ) : (
          <div className="min-h-[110px] rounded-lg bg-background/40 border animate-pulse" />
        )}

        {/* Image attachments (simple) */}
        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onSelectImages}
            hidden
            disabled={images.length >= 6}
          />
          <div className="rounded-md border border-dashed p-3 sm:p-4 bg-background/60">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1"><ImagePlus className="h-3.5 w-3.5" /> Images (max 6)</div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 6 || !initialLoaded}
                className="text-xs px-2 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50"
              >Ajouter</button>
            </div>
            {!initialLoaded && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Chargement…</div>
            )}
            {initialLoaded && images.length === 0 && (
              <div className="text-[11px] text-muted-foreground select-none">Ajoutez une image (PNG, JPG, WEBP…).</div>
            )}
            {initialLoaded && images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {images.map((url, i) => (
                  <div key={url} className="relative group">
                    <button type="button" onClick={() => setLightbox(url)} className="block h-20 w-28 overflow-hidden rounded-md border bg-background">
                      <img src={url} alt={`note-img-${i}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full w-5 h-5 text-[10px] leading-5 grid place-items-center opacity-0 group-hover:opacity-100 transition"
                      aria-label="Remove image"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-3xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute -top-3 -right-3 bg-black/80 text-white rounded-full w-8 h-8 grid place-items-center">✕</button>
            <img src={lightbox} alt="full" className="rounded-lg max-h-[90vh] w-auto object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
