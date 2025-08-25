"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";

interface Comment {
  id: string; content: string; createdAt: string; author?: { name?: string };
}

// Placeholder simple implementation – would need real endpoints
export const QuickCommentBox: React.FC = () => {
  const { recentResults } = useDashboardData();
  const [selectedLecture, setSelectedLecture] = useState<string>("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);

  // We only have lectureTitle in recentResults, so build a unique list
  const lectures = Array.from(new Set(recentResults.map(r => r.lectureTitle))).map(title => ({ id: title, title }));

  const loadComments = async (lectureId: string) => {
    // TODO replace with real fetch
    setComments([]);
  };

  const submit = async () => {
    if (!comment.trim() || !selectedLecture) return;
    setSending(true);
    try {
      // TODO real POST /api/comments
      const newComment: Comment = { id: Date.now().toString(), content: comment, createdAt: new Date().toISOString() };
      setComments(prev => [newComment, ...prev]);
      setComment("");
    } finally { setSending(false); }
  };

  return (
    <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 w-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">Commentaire rapide</CardTitle>
      </CardHeader>
      <CardContent>
        <select className="w-full mb-2 bg-secondary/40 dark:bg-secondary/30 rounded px-2 py-1 text-sm" value={selectedLecture} onChange={e=>{setSelectedLecture(e.target.value); loadComments(e.target.value);}}>
          <option value="">Choisir un cours</option>
          {lectures.map(l=> <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
        <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Votre commentaire..." className="w-full h-20 text-sm rounded bg-secondary/40 dark:bg-secondary/30 p-2 resize-none" />
        <button disabled={sending || !comment.trim() || !selectedLecture} onClick={submit} className="mt-2 w-full text-sm bg-primary text-primary-foreground rounded py-1 disabled:opacity-50">Envoyer</button>
        <div className="mt-3 max-h-40 overflow-y-auto space-y-2 text-xs">
          {comments.map(c => (
            <div key={c.id} className="p-2 bg-secondary/30 dark:bg-secondary/20 rounded">
              <div className="whitespace-pre-wrap">{c.content}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(c.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {!comments.length && selectedLecture && <div className="text-muted-foreground">Aucun commentaire.</div>}
        </div>
      </CardContent>
    </Card>
  );
};
export default QuickCommentBox;
