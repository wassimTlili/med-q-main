"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type CaseTextHighlight = { start: number; end: number };

function mergeRanges(ranges: CaseTextHighlight[]): CaseTextHighlight[] {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: CaseTextHighlight[] = [sorted[0]];
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

function simpleHash(input: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

interface HighlightableCaseTextProps {
  lectureId: string;
  text: string;
  className?: string;
}

export const HighlightableCaseText: React.FC<HighlightableCaseTextProps> = ({ lectureId, text, className }) => {
  const { user } = useAuth();
  const storageKey = useMemo(() => {
    const hash = simpleHash(text || '');
    return `case-highlights:${user?.id ?? 'anon'}:${lectureId}:${hash}`;
  }, [user?.id, lectureId, text]);

  const [highlights, setHighlights] = useState<CaseTextHighlight[]>([]);
  const [pending, setPending] = useState<CaseTextHighlight | null>(null);

  // Load from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return setHighlights([]);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setHighlights(parsed);
      else setHighlights([]);
    } catch {
      setHighlights([]);
    }
  }, [storageKey]);

  // Persist to storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(mergeRanges(highlights)));
    } catch {}
  }, [storageKey, highlights]);

  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    setPending(null);
  };

  const onMouseUp: React.MouseEventHandler<HTMLDivElement> = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    const selected = range.toString();
    const start = text.indexOf(selected);
    if (start < 0) return;
    const end = start + selected.length;
    setPending({ start, end });

    setHighlights((prev) => mergeRanges([...prev, { start, end }]));
    sel.removeAllRanges();
  };

  // Render text with highlights
  const segments = useMemo(() => {
    const ranges = mergeRanges(highlights);
    const segs: { text: string; highlighted: boolean }[] = [];
    let cursor = 0;
    for (const r of ranges) {
      if (r.start > cursor) segs.push({ text: text.slice(cursor, r.start), highlighted: false });
      segs.push({ text: text.slice(r.start, r.end), highlighted: true });
      cursor = r.end;
    }
    if (cursor < text.length) segs.push({ text: text.slice(cursor), highlighted: false });
    return segs;
  }, [text, highlights]);

  return (
    <div className={className}>
      {segments.map((s, i) => (
        <span
          key={i}
          className={s.highlighted ? 'bg-yellow-200 dark:bg-yellow-700/40 rounded-sm' : undefined}
        >
          {s.text}
        </span>
      ))}
    </div>
  );
};
