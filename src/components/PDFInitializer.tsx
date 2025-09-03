'use client';

// Configure PDF.js worker IMMEDIATELY at module level to prevent fake worker setup
if (typeof window !== 'undefined') {
  try {
    // Use require to get pdfjs synchronously
    const { pdfjs } = require('react-pdf');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      // Use local worker file for pdfjs-dist 5.3.93
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      console.log('PDF worker configured synchronously:', pdfjs.GlobalWorkerOptions.workerSrc);
    }
  } catch (error) {
    console.warn('Failed to configure PDF worker synchronously:', error);
  }
}

export function PDFInitializer() {
  // No useEffect needed - worker is configured at module level
  return null;
}
