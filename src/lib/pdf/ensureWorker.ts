// Centralized PDF.js worker setup
// Handles basePath, workerPort (module worker), and fallback workerSrc.
// Safe to call multiple times (idempotent).

import { pdfjs } from 'react-pdf';

declare global {
  interface Window { __PDF_WORKER_READY__?: boolean; }
}

export function ensurePdfWorker() {
  if (typeof window === 'undefined') return; // SSR guard
  if (window.__PDF_WORKER_READY__) return;

  try {
    // Detect Next.js basePath if any
    // @ts-ignore - __NEXT_DATA__ is injected by Next.js
    const basePath: string = (window.__NEXT_DATA__?.basePath || '').replace(/\/$/, '');
    const publicWorkerPath = `${basePath || ''}/pdf.worker.min.mjs`;

    // If a workerPort already set assume configured
    if ((pdfjs as any).GlobalWorkerOptions.workerPort) {
      window.__PDF_WORKER_READY__ = true;
      return;
    }

    let configured = false;
    // Prefer module worker via URL for modern browsers (avoids path resolution issues)
    try {
      const w = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' });
      (pdfjs as any).GlobalWorkerOptions.workerPort = w as any;
      (pdfjs as any).GlobalWorkerOptions.workerSrc = undefined; // prevent secondary fetch
      configured = true;
    } catch (err) {
      // Swallow and fallback below
      // console.debug('[pdf] module worker init failed, falling back', err);
    }

    if (!configured) {
      // Fallback to public hosted asset (ensure file exists in /public)
      if (!(pdfjs as any).GlobalWorkerOptions.workerSrc || (pdfjs as any).GlobalWorkerOptions.workerSrc !== publicWorkerPath) {
        (pdfjs as any).GlobalWorkerOptions.workerSrc = publicWorkerPath;
      }
    }

    window.__PDF_WORKER_READY__ = true;
  } catch (e) {
    // Last resort: leave as-is; react-pdf may attempt fake worker (will error visibly if still broken)
  }
}
