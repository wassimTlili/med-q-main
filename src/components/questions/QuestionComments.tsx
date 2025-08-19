"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Send, Trash2, Pencil, Loader2, UserRound } from 'lucide-react';

interface QuestionCommentsProps {
  questionId: string;
}

type QComment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name?: string | null; email: string; role: string };
};

export function QuestionComments({ questionId }: QuestionCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<QComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const canPost = !!user?.id && text.trim().length > 0 && !submitting;
  const ownerId = user?.id;

  const load = useMemo(() => async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/question-comments?questionId=${questionId}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setComments(data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!ownerId) {
      toast({ title: 'Sign in required', description: 'Please sign in to comment', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/question-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, userId: ownerId, content: text }),
      });
      if (!res.ok) throw new Error('Failed');
      const created: QComment = await res.json();
      setComments(prev => [created, ...prev]);
      setText('');
    } catch {
      toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const res = await fetch(`/api/question-comments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setComments(prev => prev.filter(c => c.id !== id));
    } catch {
      toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' });
    }
  };

  const beginEdit = (c: QComment) => {
    setEditingId(c.id);
    setEditText(c.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/question-comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editText.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: QComment = await res.json();
      setComments(prev => prev.map(c => c.id === id ? updated : c));
      cancelEdit();
    } catch {
      toast({ title: 'Error', description: 'Failed to update comment', variant: 'destructive' });
    }
  };

  return (
    <div className="mt-4">
      <div className="rounded-xl border bg-muted/30">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary grid place-items-center">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="text-sm font-medium">Comments</div>
          <div className="ml-auto text-xs text-muted-foreground">{comments.length}</div>
        </div>

        <div className="p-3 sm:p-4 space-y-4">
          {/* Input */}
          {user?.id ? (
            <div className="rounded-lg border bg-background/70 p-2 sm:p-3">
              <Textarea
                placeholder="Write a comment…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canPost) add(); }}
                className="min-h-[80px]"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Press Ctrl/Cmd+Enter to send</span>
                <Button size="sm" onClick={add} disabled={!canPost}>
                  {submitting ? (<><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Posting</>) : (<><Send className="h-3.5 w-3.5 mr-1" /> Post</>)}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-background/50 p-3 text-sm text-muted-foreground flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Sign in to join the discussion.
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-2">
              <div className="h-14 rounded-md bg-muted animate-pulse" />
              <div className="h-14 rounded-md bg-muted animate-pulse" />
            </div>
          )}

          {/* Empty state */}
          {!loading && comments.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No comments yet.
            </div>
          )}

          {/* List */}
          <ul className="space-y-3">
            {comments.map((c) => {
              const isOwner = ownerId && (ownerId === c.user.id);
              const isEditing = editingId === c.id;
              const initials = (c.user?.name || c.user?.email || '?').slice(0,1).toUpperCase();
              return (
                <li key={c.id} className="rounded-lg border bg-background/60 p-3">
                  <div className="flex items-start gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate max-w-[160px] sm:max-w-[260px]">{c.user?.name || c.user?.email}</span>
                        <span>•</span>
                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                        {c.updatedAt && c.updatedAt !== c.createdAt && (<span className="italic">(edited)</span>)}
                      </div>
                      {!isEditing ? (
                        <div className="mt-1 text-sm whitespace-pre-wrap">{c.content}</div>
                      ) : (
                        <div className="mt-2">
                          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[80px]" />
                          <div className="mt-2 flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                            <Button size="sm" onClick={() => saveEdit(c.id)} disabled={!editText.trim()}>Save</Button>
                          </div>
                        </div>
                      )}
                    </div>
                    {isOwner && !isEditing && (
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => beginEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => remove(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
