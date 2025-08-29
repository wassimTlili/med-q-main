'use client'

import { useEffect, useRef } from 'react';

const initializePDFJS = () => {
  if (typeof window === 'undefined') return;
  try {
    // Dynamic import to avoid SSR issues
    import('react-pdf').then(({ pdfjs }) => {
      // Use worker from /public to avoid build resolution issues
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    });
  } catch (e) {
    console.error('[PDFProvider] Failed to set pdf.js worker', e);
  }
};

export function PDFProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initializePDFJS();
      initialized.current = true;
    }
  }, []);
  return <>{children}</>;
}