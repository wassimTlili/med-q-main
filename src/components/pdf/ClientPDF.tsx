"use client";

import dynamic from 'next/dynamic';
import React from 'react';
import { pdfjs } from 'react-pdf';

// Robust worker configuration (production safe)
// Ensure we point to the hosted worker file BEFORE any <Document/> mounts to avoid fake worker fallback
try {
	if (typeof window !== 'undefined') {
		const expected = '/pdf.worker.min.mjs';
		if (!pdfjs.GlobalWorkerOptions.workerSrc || pdfjs.GlobalWorkerOptions.workerSrc !== expected) {
			pdfjs.GlobalWorkerOptions.workerSrc = expected;
			// Optional: silent in production – uncomment for debugging
			// console.log('[pdf] workerSrc set to', expected);
		}
	}
} catch (e) {
	// Swallow – react-pdf will attempt its own fallback (which we want to avoid, but no crash)
}

// Dynamically import heavy components (no SSR) after worker path is set
const Document = dynamic(() => import('react-pdf').then(m => m.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(m => m.Page), { ssr: false });

export { Document, Page };
