'use client'

import { useEffect, useRef } from 'react';

/**
 * Centralized, idempotent pdf.js worker initialization for react-pdf.
 * Production issues observed:
 *  - 404 on worker when middleware rewrites or when multiple dynamic imports race.
 *  - "PDFWorker.create - the worker is being destroyed" when Strict Mode double-invokes effects
 *    and we create/revoke object URLs repeatedly.
 *  - Hydration / timing issues if workerSrc set after first <Document/> mount.
 *
 * Strategy:
 *  - Cache the resolved workerSrc on window.__PDF_WORKER_SRC__ (never revoke during session).
 *  - Try module import (bundled via alias) -> blob indirection (avoids network) -> public fallbacks.
 *  - Guard against concurrent initializations with a promise singleton.
 *  - Fail fast with a single console.error only once.
 */
interface WorkerCacheWindow extends Window {
  __PDF_WORKER_SRC__?: string;
  __PDF_WORKER_INIT__?: Promise<string | null>;
}

const globalWin: WorkerCacheWindow | undefined =
  typeof window !== 'undefined' ? (window as WorkerCacheWindow) : undefined;

async function resolveWorkerOnce(): Promise<string | null> {
  if (!globalWin) return null;
  if (globalWin.__PDF_WORKER_SRC__) return globalWin.__PDF_WORKER_SRC__;
  if (globalWin.__PDF_WORKER_INIT__) return globalWin.__PDF_WORKER_INIT__;

  globalWin.__PDF_WORKER_INIT__ = (async () => {
    try {
      const { pdfjs } = await import('react-pdf');

      // 1. Attempt direct module based blob (tree-shake friendly, no network request)
      try {
        await import('pdfjs-dist/build/pdf.worker.min.mjs');
        const blobSource = "import 'pdfjs-dist/build/pdf.worker.min.mjs';";
        const blob = new Blob([blobSource], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        pdfjs.GlobalWorkerOptions.workerSrc = url;
        globalWin.__PDF_WORKER_SRC__ = url;
        return url;
      } catch (e) {
        // silent – will try fallbacks
      }

      // 2. Public fallback copies
      const fallbacks = ['/pdf.worker.min.mjs', '/pdf.worker.mjs'];
      for (const fb of fallbacks) {
        try {
          const head = await fetch(fb, { method: 'HEAD' });
          if (head.ok) {
            pdfjs.GlobalWorkerOptions.workerSrc = fb;
            globalWin.__PDF_WORKER_SRC__ = fb;
            return fb;
          }
        } catch {
          /* continue */
        }
      }
      console.error('[PDFProvider] Unable to locate a valid pdf.js worker file.');
      return null;
    } catch (err) {
      console.error('[PDFProvider] Initialization failed', err);
      return null;
    }
  })();

  return globalWin.__PDF_WORKER_INIT__;
}

async function ensurePdfWorker() {
  const url = await resolveWorkerOnce();
  if (url) {
    // Avoid logging repeatedly in dev strict re-renders
    if (!(globalWin as any).__PDF_WORKER_LOGGED__) {
      // eslint-disable-next-line no-console
      console.info('[PDFProvider] pdf.js worker ready:', url);
      (globalWin as any).__PDF_WORKER_LOGGED__ = true;
    }
  }
}

export function PDFProvider({ children }: { children: React.ReactNode }) {
  const ran = useRef(false);
  useEffect(() => {
    if (!ran.current) {
      void ensurePdfWorker();
      ran.current = true;
    }
  }, []);
  return <>{children}</>;
}