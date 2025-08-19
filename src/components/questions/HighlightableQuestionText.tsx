"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type TextHighlight = { start: number; end: number };

interface HighlightableQuestionTextProps {
  questionId: string;
  text: string;
  className?: string;
}

function mergeRanges(ranges: TextHighlight[]): TextHighlight[] {
  if (ranges.length === 0) return ranges;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TextHighlight[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

export const HighlightableQuestionText: React.FC<HighlightableQuestionTextProps> = ({ questionId, text, className }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const storageKey = useMemo(() => `q-highlights:${user?.id ?? 'anon'}:${questionId}`, [user?.id, questionId]);
  const [highlights, setHighlights] = useState<TextHighlight[]>([]);
  const saveTimer = useRef<number | null>(null);
  const initialLoadedRef = useRef(false);
  const [pending, setPending] = useState<TextHighlight | null>(null);
  const [bubble, setBubble] = useState<{ x: number; y: number } | null>(null);

  const refreshFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHighlights(parsed);
        else setHighlights([]);
      } else {
        setHighlights([]);
      }
    } catch {
      setHighlights([]);
    }
  }, [storageKey]);

  // Load from storage initially and when key changes
  useEffect(() => {
    refreshFromStorage();
  }, [refreshFromStorage]);

  // If signed in, load highlights from API and fall back to storage
  useEffect(() => {
    let aborted = false;
    async function loadFromApi() {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/user-question-state?userId=${user.id}&questionId=${questionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (aborted) return;
        if (data?.highlights && Array.isArray(data.highlights)) {
          // Basic sanity clamp
          const sanitized = (data.highlights as TextHighlight[])
            .filter(r => typeof r?.start === 'number' && typeof r?.end === 'number')
            .map(r => ({ start: Math.max(0, Math.min(r.start, text.length)), end: Math.max(0, Math.min(r.end, text.length)) }))
            .filter(r => r.end > r.start);
          setHighlights(sanitized);
          try { localStorage.setItem(storageKey, JSON.stringify(sanitized)); } catch {}
        }
      } catch {}
    }
    loadFromApi();
    return () => { aborted = true; };
  }, [user?.id, questionId, text.length, storageKey]);

  // Listen to external change notifications (e.g., buttons applying/clearing highlights)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { questionId?: string } | undefined;
      if (!detail || detail.questionId !== questionId) return;
      refreshFromStorage();
    };
    window.addEventListener('question-highlight-changed', handler as EventListener);
    return () => window.removeEventListener('question-highlight-changed', handler as EventListener);
  }, [questionId, refreshFromStorage]);

  // Persist to storage and backend (debounced)
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(highlights)); } catch {}
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      if (user?.id) {
        try {
          await fetch('/api/user-question-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, questionId, highlights }),
          });
        } catch {}
      }
    }, 400) as unknown as number;
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [highlights, storageKey, user?.id, questionId]);

  const addHighlight = useCallback((range: TextHighlight) => {
    if (range.end <= range.start) return;
    const clamped: TextHighlight = { start: Math.max(0, range.start), end: Math.min(text.length, range.end) };
    setHighlights(prev => mergeRanges([...prev, clamped]));
  }, [text.length]);

  const removeHighlightAt = useCallback((index: number) => {
    setHighlights(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleMouseUp = useCallback(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;

    const pre = document.createRange();
    pre.selectNodeContents(root);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const selectedText = range.toString();
    const end = start + selectedText.length;
    // Show floating confirm button near selection instead of auto-highlighting
    const rect = range.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const x = rect.left - rootRect.left + rect.width / 2;
    const y = rect.top - rootRect.top; // place above selection
    setPending({ start, end });
    setBubble({ x, y });
  }, [addHighlight]);

  const parts = useMemo(() => {
    if (!highlights.length) return [{ text, highlighted: false, index: -1 }];
    const merged = mergeRanges(highlights).filter(r => r.start < r.end);
    const segments: Array<{ text: string; highlighted: boolean; index: number }> = [];
    let cursor = 0;
    merged.forEach((r, idx) => {
      if (cursor < r.start) {
        segments.push({ text: text.slice(cursor, r.start), highlighted: false, index: -1 });
      }
      segments.push({ text: text.slice(r.start, r.end), highlighted: true, index: idx });
      cursor = r.end;
    });
    if (cursor < text.length) {
      segments.push({ text: text.slice(cursor), highlighted: false, index: -1 });
    }
    return segments;
  }, [text, highlights]);

  // Dismiss bubble on outside click / escape / scroll
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const root = wrapperRef.current;
      if (!root) return;
      const target = e.target as Node;
      // If click inside the bubble or selection region, keep
      const bubbleEl = root.querySelector('[data-hl-bubble="1"]');
      if (bubbleEl && bubbleEl.contains(target)) return;
      // Otherwise hide
      if (bubble) { setBubble(null); setPending(null); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setBubble(null); setPending(null); const sel = window.getSelection(); sel?.removeAllRanges(); } };
    const onScroll = () => { if (bubble) { setBubble(null); setPending(null); } };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [bubble]);

  return (
    <div
      ref={wrapperRef}
      className={[className, 'relative'].filter(Boolean).join(' ')}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      role="textbox"
      aria-label="Question text"
    >
      {parts.map((p, i) => p.highlighted ? (
        <mark
          key={`hl-${i}`}
          className="bg-yellow-200 px-0.5 rounded cursor-pointer"
          onClick={(e) => { e.stopPropagation(); removeHighlightAt(p.index); }}
          title="Click to remove highlight"
        >
          {p.text}
        </mark>
      ) : (
        <React.Fragment key={`tx-${i}`}>{p.text}</React.Fragment>
      ))}
      {bubble && pending && (
        <div
          data-hl-bubble="1"
          className="absolute z-50 -translate-x-1/2 -translate-y-full bg-white dark:bg-neutral-900 border rounded shadow px-2 py-1 flex items-center gap-2 text-xs"
          style={{ left: bubble.x, top: Math.max(0, bubble.y - 6) }}
        >
          <button
            className="px-2 py-0.5 rounded bg-yellow-300 text-black hover:bg-yellow-400"
            onClick={(e) => {
              e.stopPropagation();
              addHighlight(pending);
              const sel = window.getSelection(); sel?.removeAllRanges();
              setBubble(null); setPending(null);
            }}
            title="Souligner"
          >
            Souligner
          </button>
          <button
            className="px-2 py-0.5 rounded border hover:bg-neutral-50 dark:hover:bg-neutral-800"
            onClick={(e) => { e.stopPropagation(); const sel = window.getSelection(); sel?.removeAllRanges(); setBubble(null); setPending(null); }}
            title="Annuler"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
};
