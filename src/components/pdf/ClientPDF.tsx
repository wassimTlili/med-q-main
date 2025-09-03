"use client";

import dynamic from 'next/dynamic';
import React from 'react';
import { pdfjs } from 'react-pdf';
import { ensurePdfWorker } from '@/lib/pdf/ensureWorker';

// Robust worker configuration (production safe)
// Ensure we point to the hosted worker file BEFORE any <Document/> mounts to avoid fake worker fallback
// Idempotent worker setup
ensurePdfWorker();

// Dynamically import heavy components (no SSR) after worker path is set
const Document = dynamic(() => import('react-pdf').then(m => m.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(m => m.Page), { ssr: false });

export { Document, Page };
