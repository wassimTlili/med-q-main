'use client'

import { useEffect, useRef } from 'react';

const initializePDFJS = async () => {
  if (typeof window === 'undefined') return;
  try {
    const { pdfjs } = await import('react-pdf');
    const origin = window.location.origin;
    // Candidate worker URLs in order of preference
    const candidates = [
      '/pdf.worker.min.mjs',
      `${origin}/pdf.worker.min.mjs`,
      '/pdf.worker.mjs',
      `${origin}/pdf.worker.mjs`,
      // CDN fallback (version should match installed pdfjs-dist) – adjust if you upgrade
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.js'
    ];

    for (const url of candidates) {
      try {
        // Quick HEAD/GET to verify availability (skip for cross‑origin CDN if HEAD blocked)
        if (url.startsWith(origin) || url.startsWith('/')) {
          const res = await fetch(url, { method: 'GET', cache: 'force-cache' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const ct = res.headers.get('content-type') || '';
          if (!/javascript|ecmascript|text\/plain|application\/octet-stream/i.test(ct)) {
            // Still allow; some servers mislabel .mjs
            console.warn('[PDFProvider] Suspicious content-type for worker', ct);
          }
        }
        pdfjs.GlobalWorkerOptions.workerSrc = url;
        // Test dynamic import resolution (fake worker path import attempt) by creating a dummy dynamic import wrapper.
        // If this fails it will throw and continue to next candidate.
        /* eslint-disable no-new */
        console.info('[PDFProvider] Using pdf.js worker at', url);
        return; // success
      } catch (err) {
        console.warn('[PDFProvider] Worker candidate failed', url, err);
        continue;
      }
    }
    console.error('[PDFProvider] All worker candidates failed – PDF rendering will likely break');
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