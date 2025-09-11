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
  const [images, setImages] = useState<string[]>([]); // persisted URLs
  const [pendingFiles, setPendingFiles] = useState<File[]>([]); // before upload (future integration)
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Load existing note
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/user-question-state?userId=${user.id}&questionId=${questionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          if (typeof data?.notes === 'string') {
            setValue(data.notes);
            lastSavedValueRef.current = data.notes;
            setLastSavedAt(new Date());
          }
          if (Array.isArray(data?.notesImageUrls)) {
            setImages(data.notesImageUrls as string[]);
          }
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
  setImages([]);
  setPendingFiles([]);
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
        body: JSON.stringify({ userId: user.id, questionId, notes: value, notesImageUrls: images }),
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
    setImages([]);
    // Trigger immediate save of empty value silently
    await save(true);
    toast({ title: 'Cleared', description: 'Your note was cleared.' });
  };

  const onSelectImages: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 6 - images.length;
    if (remaining <= 0) {
      toast({ title: 'Limit reached', description: 'Maximum 6 images allowed', variant: 'destructive' });
      return;
    }
    const slice = files.slice(0, remaining);
    
    const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
      if (file.size > 150 * 1024) { // 150KB cap
        return reject(new Error('File too large (max 150KB)'));
      }
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
        if (data.startsWith('data:image/')) {
          newUrls.push(data);
        } else {
          skipped++;
        }
      } catch (err) {
        skipped++;
        console.warn('Failed to process image:', f.name, err);
      }
    }
    
    if (newUrls.length) {
      setImages(prev => [...prev, ...newUrls].slice(0,6));
      setPendingFiles(prev => [...prev, ...slice]);
      toast({ 
        title: 'Images added', 
        description: `${newUrls.length} image(s) processed${skipped ? `, ${skipped} skipped` : ''}` 
      });
      setTimeout(() => { void save(true); }, 200);
    } else if (skipped) {
      toast({ 
        title: 'Upload failed', 
        description: `${skipped} image(s) were too large or invalid`, 
        variant: 'destructive' 
      });
    }
  };

  const removeImage = (url: string) => {
    setImages(prev => prev.filter(u => u !== url));
    setTimeout(() => { void save(true); }, 150);
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

        {/* Image attachments */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Images (max 6)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onSelectImages}
              disabled={images.length >= 6}
              className="text-xs"
            />
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {images.map((url, i) => {
                // Skip broken blob URLs
                if (url.startsWith('blob:')) return null;
                return (
                  <div key={url} className="relative group">
                    <button type="button" onClick={() => setLightbox(url)} className="block w-full h-20 overflow-hidden rounded-md border bg-background">
                      <img 
                        src={url} 
                        alt={`note-img-${i}`} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          // Hide broken images
                          const target = e.target as HTMLImageElement;
                          target.closest('.relative')?.remove();
                        }}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full w-5 h-5 text-[10px] leading-5 grid place-items-center opacity-0 group-hover:opacity-100 transition"
                      aria-label="Remove image"
                    >×</button>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}
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
