"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// PDF components are dynamically imported with SSR disabled to prevent server-side issues
// Worker is configured in PDFInitializer at app level
const Document = dynamic(() => import('react-pdf').then(m => m.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(m => m.Page), { ssr: false });export { Document, Page };
