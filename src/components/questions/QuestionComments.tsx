"use client";

import { useEffect, useMemo, useState, useRef, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Send, Loader2, UserRound, EyeOff, ChevronDown, ChevronRight, ImagePlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface QuestionCommentsProps { questionId: string; }

type QComment = {
  id: string;
  content: string;
  isAnonymous?: boolean;
  createdAt: string;
  updatedAt: string;
  parentCommentId?: string | null;
  replies?: QComment[];
  imageUrls?: string[]; // optional images returned by API
  user: { id: string; name?: string | null; email: string; role: string };
};

export function QuestionComments({ questionId }: QuestionCommentsProps) {
  const { user } = useAuth();
  const ownerId = user?.id;
  const isAdmin = user?.role === 'admin';

  const [comments, setComments] = useState<QComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [postAnonymous, setPostAnonymous] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]); // base64 or hosted URLs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(false);

  const canPostRoot = !!ownerId && (text.trim().length > 0 || images.length > 0) && !submitting;
  const canPostReply = !!ownerId && replyParentId && !submitting; // handled inside reply editor

  const load = useMemo(() => async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/question-comments?questionId=${questionId}`);
      if (!res.ok) throw new Error('Failed');
      const data: QComment[] = await res.json();
      setComments(data || []);
    } catch {
      // silent
    } finally { setLoading(false); }
  }, [questionId]);

  useEffect(() => { load(); }, [load]);

  const insertReply = (nodes: QComment[], parentId: string, newNode: QComment): QComment[] =>
    nodes.map(n => n.id === parentId
      ? { ...n, replies: [newNode, ...(n.replies || [])] }
      : { ...n, replies: n.replies ? insertReply(n.replies, parentId, newNode) : n.replies });

  const updateNode = (nodes: QComment[], id: string, updater: (c: QComment) => QComment): QComment[] =>
    nodes.map(n => n.id === id ? updater(n) : { ...n, replies: n.replies ? updateNode(n.replies, id, updater) : n.replies });

  const removeNode = (nodes: QComment[], id: string): QComment[] =>
    nodes.filter(n => n.id !== id).map(n => ({ ...n, replies: n.replies ? removeNode(n.replies, id) : n.replies }));

  const add = async (parentId?: string, contentOverride?: string, imageList?: string[]) => {
    if (!ownerId) { toast({ title: 'Sign in required', description: 'Please sign in to comment', variant: 'destructive' }); return; }
    const content = (parentId ? (contentOverride||'') : text).trim();
    const imgs = imageList || (parentId ? [] : images);
    if (!content && imgs.length === 0) return; // block empty (no text, no images)
    try {
      setSubmitting(true);
  const res = await fetch('/api/question-comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, userId: ownerId, content, isAnonymous: postAnonymous, parentCommentId: parentId, imageUrls: imgs }) });
      if (!res.ok) throw new Error('Failed');
      const created: QComment = await res.json();
      if (parentId) {
        setComments(prev => insertReply(prev, parentId, created));
        setReplyParentId(null);
      } else {
        setComments(prev => [created, ...prev]);
        setText('');
  setImages([]);
      }
    } catch { toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const beginEdit = (c: QComment) => { setEditingId(c.id); setEditText(c.content); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };
  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/question-comments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: editText.trim() }) });
      if (!res.ok) throw new Error('Failed');
      const updated: QComment = await res.json();
      setComments(prev => updateNode(prev, id, () => updated));
      cancelEdit();
    } catch { toast({ title: 'Error', description: 'Failed to update comment', variant: 'destructive' }); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const res = await fetch(`/api/question-comments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setComments(prev => removeNode(prev, id));
    } catch { toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' }); }
  };

  const startReply = (id: string) => { setReplyParentId(id); };
  const cancelReply = () => { setReplyParentId(null); };

  // Local reply editor to isolate keystroke re-renders
  const ReplyEditor = ({ parentId }: { parentId: string }) => {
    const [value, setValue] = useState('');
    const localRef = useRef<HTMLTextAreaElement | null>(null);
    useEffect(()=>{ localRef.current?.focus(); },[]);
    const disabled = !value.trim() || submitting;
    return (
      <div className="mt-3 space-y-2">
        <Textarea
          ref={localRef}
          placeholder="Write a reply..."
          value={value}
            onChange={(e)=> setValue(e.target.value)}
          onKeyDown={(e)=> {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !disabled) {
              e.preventDefault();
              add(parentId, value);
              setValue('');
            } else if (e.key === 'Enter' && !e.shiftKey) {
              if (value.trim()) {
                e.preventDefault();
                if(!disabled){ add(parentId, value); setValue(''); }
              }
            }
          }}
          className="min-h-[60px]"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={disabled} onClick={()=> { add(parentId, value); setValue(''); }}>Post reply</Button>
          <Button size="sm" variant="ghost" onClick={cancelReply}>Cancel</Button>
        </div>
      </div>
    );
  };

  const CommentNode = memo(({ c, depth = 0 }: { c: QComment; depth?: number }) => {
    const isOwner = c.user.id === ownerId;
    const canDelete = isOwner || isAdmin;
    const isEditing = editingId === c.id;
    const displayName = c.isAnonymous ? 'Anonyme' : (c.user.name || c.user.email.split('@')[0]);

    return (
      <li className="group rounded-md border bg-background/60 p-3" style={{ marginLeft: depth ? depth * 14 : 0 }}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-7 w-7 shrink-0 rounded-md bg-primary/10 grid place-items-center text-primary">
            {c.isAnonymous ? <EyeOff className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/90">{displayName}</span>
              <span className="text-[10px]">{new Date(c.createdAt).toLocaleString()}</span>
              {c.updatedAt !== c.createdAt && <span className="text-[10px] italic">(modifié)</span>}
            </div>
            <div className="mt-1 text-sm whitespace-pre-wrap break-words">
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e)=> setEditText(e.target.value)}
                    onKeyDown={(e)=> {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveEdit(c.id); }
                    }}
                    className="min-h-[70px]"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={()=> saveEdit(c.id)} disabled={!editText.trim()}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div>{c.content || (c.imageUrls?.length ? <span className="italic text-muted-foreground">(images seulement)</span> : null)}</div>
              )}
            </div>
            {!isEditing && c.imageUrls && c.imageUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {c.imageUrls.map((u,i)=>(
                  <button
                    key={i}
                    type="button"
                    className="relative group"
                    onClick={()=> setLightbox(u)}
                    title="Voir l'image"
                  >
                    <img
                      src={u}
                      alt="Image du commentaire"
                      className="h-24 w-24 object-cover rounded-md border shadow-sm transition-transform group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => startReply(c.id)}>Reply</Button>
              {isOwner && !isEditing && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" title="Edit" onClick={() => beginEdit(c)}>Edit</Button>
              )}
              {canDelete && !isEditing && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" title="Delete" onClick={() => remove(c.id)}>Delete</Button>
              )}
            </div>
            {replyParentId === c.id && <ReplyEditor parentId={c.id} />}
            {c.replies && c.replies.length > 0 && (
              <ul className="mt-3 space-y-2">
                {[...c.replies].sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(r => (
                  <CommentNode key={r.id} c={r} depth={depth+1} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </li>
    );
  });
  CommentNode.displayName = 'CommentNode';

  return (
    <div className="mt-4">
      <div className="rounded-xl border bg-muted/30">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary grid place-items-center">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="text-sm font-medium">Comments</div>
          <div className="ml-auto text-xs text-muted-foreground">{comments.length}</div>
        </div>
        <div className="p-3 sm:p-4 space-y-4">
          {ownerId ? (
            <div className="rounded-lg border bg-background/70 p-2 sm:p-3">
              <Textarea
                placeholder="Write a comment…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canPostRoot) {
                    e.preventDefault();
                    add();
                  } else if (e.key === 'Enter' && !e.shiftKey) {
                    if (text.trim()) {
                      e.preventDefault();
                      if (canPostRoot) add();
                    }
                  }
                }}
                className="min-h-[80px]"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <label className="flex items-center gap-2">
                  <Checkbox checked={postAnonymous} onCheckedChange={(v)=> setPostAnonymous(!!v)} className="h-4 w-4" />
                  Poster en anonyme
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      const remaining = 6 - images.length;
                      if (remaining <= 0) { toast({ title: 'Limit reached', description: 'Maximum 6 images allowed', variant: 'destructive' }); return; }
                      const slice = files.slice(0, remaining);
                      const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onerror = () => reject(r.error); r.onload = () => resolve(r.result as string); r.readAsDataURL(file); });
                      const results: string[] = []; let skipped = 0;
                      for (const f of slice) { try { const data = await toDataUrl(f); if (data.startsWith('data:image/')) results.push(data); else skipped++; } catch { skipped++; } }
                      if (results.length) { setImages(prev => [...prev, ...results].slice(0,6)); toast({ title: 'Images added', description: `${results.length} image(s) added${skipped?`, ${skipped} skipped`:''}` }); }
                      else if (skipped) { toast({ title: 'No images added', description: `${skipped} image(s) could not be processed`, variant: 'destructive' }); }
                      e.target.value='';
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" className="h-8" onClick={()=> fileInputRef.current?.click()} disabled={submitting}>Images</Button>
                  <Button size="sm" disabled={!canPostRoot} onClick={() => add()}>
                    {submitting ? (<><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Posting</>) : (<><Send className="h-3.5 w-3.5 mr-1" /> Post</>)}
                  </Button>
                </div>
              </div>
              <button
                type="button"
                onClick={()=> setShowImages(o=> !o)}
                className="mt-3 w-full flex items-center justify-between text-left text-[11px] font-medium text-muted-foreground hover:text-foreground transition"
              >
                <span className="inline-flex items-center gap-1">
                  {showImages ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Images (max 6)
                  {images.length > 0 && <span className="ml-1 text-[9px] rounded bg-primary/10 px-1 py-0.5 text-primary">{images.length}</span>}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px]">{showImages ? 'Masquer' : 'Afficher'}</span>
              </button>
              {showImages && (
                <div
                  onDragOver={(e)=>{ e.preventDefault(); if(!dragActive) setDragActive(true); }}
                  onDragLeave={(e)=> { if((e.target as HTMLElement)===e.currentTarget) setDragActive(false); }}
                  onDrop={async (e)=> { e.preventDefault(); setDragActive(false); const files = Array.from(e.dataTransfer.files||[]); if(files.length){ const remaining = 6 - images.length; if(remaining<=0){ toast({ title: 'Limit reached', description: 'Maximum 6 images allowed', variant: 'destructive' }); return;} const slice=files.slice(0,remaining); const toDataUrl=(file:File)=> new Promise<string>((resolve,reject)=>{const r=new FileReader(); r.onerror=()=>reject(r.error); r.onload=()=>resolve(r.result as string); r.readAsDataURL(file);}); const results:string[]=[]; let skipped=0; for(const f of slice){ try{ const data=await toDataUrl(f); if(data.startsWith('data:image/')) results.push(data); else skipped++; } catch{ skipped++; } } if(results.length){ setImages(prev=>[...prev,...results].slice(0,6)); toast({ title:'Images added', description: `${results.length} image(s) added${skipped?`, ${skipped} skipped`:''}`}); } else if(skipped){ toast({ title:'No images added', description: `${skipped} image(s) could not be processed`, variant:'destructive'}); } } }}
                  className={`mt-2 rounded-md border border-dashed p-3 transition text-xs ${dragActive? 'border-primary bg-primary/5':'border-muted-foreground/30 bg-background/50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-medium text-muted-foreground inline-flex items-center gap-1"><ImagePlus className="h-3 w-3" /> Ajouter</div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={images.length >= 6}
                      className="text-[10px] px-2 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50"
                    >Parcourir</button>
                  </div>
                  {images.length === 0 && (
                    <div className="text-[11px] text-muted-foreground">Glissez-déposez des images ici ou cliquez sur Parcourir.</div>
                  )}
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {images.map((url, i) => (
                        <div key={i} className="relative group">
                          <button type="button" onClick={()=> setLightbox(url)} className="block">
                            <img src={url} alt="preview" className="h-24 w-24 object-cover rounded-md border transition-transform group-hover:scale-105" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setImages(imgs => imgs.filter((_, idx) => idx !== i))}
                            className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full w-6 h-6 text-[11px] grid place-items-center opacity-0 group-hover:opacity-100 transition"
                            aria-label="Remove image"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-background/50 p-3 text-sm text-muted-foreground flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Sign in to join the discussion.
            </div>
          )}
          {loading && (
            <div className="space-y-2">
              <div className="h-14 rounded-md bg-muted animate-pulse" />
              <div className="h-14 rounded-md bg-muted animate-pulse" />
            </div>
          )}
          {!loading && comments.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No comments yet.</div>
          )}
          <ul className="space-y-3">{comments.map(c => <CommentNode key={c.id} c={c} />)}</ul>
        </div>
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-5xl max-h-[90vh] relative" onClick={(e)=> e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 bg-black/80 text-white rounded-full w-8 h-8 grid place-items-center text-sm"
              aria-label="Fermer"
            >✕</button>
            <img
              src={lightbox}
              alt="Agrandissement image commentaire"
              className="rounded-lg max-h-[90vh] w-auto object-contain shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
