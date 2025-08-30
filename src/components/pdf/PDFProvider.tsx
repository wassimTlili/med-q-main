'use client'

import { useEffect, useRef } from 'react';

const initializePDFJS = async () => {
  if (typeof window === 'undefined') return;
  try {
    const { pdfjs } = await import('react-pdf');
    const origin = window.location.origin;
    // Candidate worker URLs in order of preference
    try {
      // Primary: build a Blob URL from the actual module so no network fetch needed.
      const workerModuleUrl = await (async () => {
        try {
          // This path is aliased in next.config.js
          await import('pdfjs-dist/build/pdf.worker.min.mjs');
          // Dynamic import ensures Next.js bundles worker chunk; we then create a tiny blob that re-imports it.
          const blobSource = "import 'pdfjs-dist/build/pdf.worker.min.mjs';";
          const blob = new Blob([blobSource], { type: 'text/javascript' });
          return URL.createObjectURL(blob);
        } catch (e) {
          return null;
        }
      })();
      if (workerModuleUrl) {
        pdfjs.GlobalWorkerOptions.workerSrc = workerModuleUrl;
        console.info('[PDFProvider] Using Blob pdf.js worker');
        return;
      }
    } catch (blobErr) {
      console.warn('[PDFProvider] Blob worker creation failed, falling back', blobErr);
    }

    // Fallback: use public file copies (ensured by middleware bypass)
    const fallbackOrder = [
      '/pdf.worker.min.mjs',
      '/pdf.worker.mjs'
    ];
    for (const fb of fallbackOrder) {
      try {
        const res = await fetch(fb, { method: 'GET', cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        pdfjs.GlobalWorkerOptions.workerSrc = fb;
        console.info('[PDFProvider] Using fallback public worker', fb);
        return;
      } catch (e) {
        console.warn('[PDFProvider] Fallback worker not accessible', fb, e);
      }
    }
    console.error('[PDFProvider] Failed to resolve any pdf.js worker');
  } catch (e) {
    console.error('[PDFProvider] Failed to initialize pdf.js', e);
  }
};

export function PDFProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      void initializePDFJS();
      initialized.current = true;
    }
  }, []);
  return <>{children}</>;
}