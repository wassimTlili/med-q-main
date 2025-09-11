export type ExtractedPage = { page: number; text: string };

export async function extractPdfTextPerPage(data: Uint8Array | ArrayBuffer): Promise<ExtractedPage[]> {
  // pdfjs-dist (newer versions) may rely on DOMMatrix in Node; provide minimal polyfill if absent.
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    class SimpleDOMMatrix {
      a=1; b=0; c=0; d=1; e=0; f=0; is2D=true; isIdentity=true;
      constructor(_init?: any) {}
      multiplySelf() { return this; }
      translateSelf() { return this; }
      scaleSelf() { return this; }
      rotateSelf() { return this; }
      toString() { return 'matrix(1,0,0,1,0,0)'; }
    }
    ;(globalThis as any).DOMMatrix = SimpleDOMMatrix as any;
  }
  // Polyfill Promise.withResolvers for Node < 20
  if (typeof (Promise as any).withResolvers !== 'function') {
    (Promise as any).withResolvers = function() {
      let resolve: any, reject: any;
      const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
      return { promise, resolve, reject };
    };
  }
  // Load pdfjs dynamically from the package root (v5 exports getDocument at root)
  const pdfModule: any = await import('pdfjs-dist');
  const pdfjs: any = (pdfModule && (pdfModule as any).getDocument) ? pdfModule : (pdfModule as any).default ?? pdfModule;
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const loadingTask = pdfjs.getDocument({ data: bytes, disableWorker: true, useSystemFonts: true, disableFontFace: true });
  const doc = await loadingTask.promise;
  const pages: ExtractedPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const str = content.items.map((it: any) => (it.str ?? '')).join(' ');
    const clean = cleanMedicalText(str); // Use medical text cleaning
    pages.push({ page: i, text: clean });
  }
  return pages;
}

export function cleanMedicalText(text: string): string {
  // Clean text while preserving medical terms and structure (notebook logic)
  // Preserve important punctuation for medical context
  text = text.replace(/[^\w\s\.\,\(\)\-\:\;]/g, ' ');
  
  // Remove excessive whitespace but preserve paragraph breaks
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.replace(/ +/g, ' ');
  
  return text.trim();
}

export function splitIntoChunks(text: string, opts?: { chunkSize?: number; chunkOverlap?: number }): string[] {
  const size = opts?.chunkSize ?? 800;
  const overlap = opts?.chunkOverlap ?? 300; // Increased to match notebook (was 150)
  
  // Use medical-friendly separators (notebook logic)
  const separators = ['\n\n', '\n', '. ', ' '];
  
  return recursiveSplit(text, size, overlap, separators);
}

function recursiveSplit(text: string, chunkSize: number, overlap: number, separators: string[]): string[] {
  if (text.length <= chunkSize) {
    return text.trim() ? [text.trim()] : [];
  }
  
  // Try each separator
  for (const sep of separators) {
    if (text.includes(sep)) {
      const parts = text.split(sep);
      if (parts.length > 1) {
        const chunks: string[] = [];
        let currentChunk = '';
        
        for (const part of parts) {
          if (!part.trim()) continue;
          
          // Add separator back except for space
          const partWithSep = part + (sep !== ' ' ? sep : '');
          
          if (currentChunk.length + partWithSep.length <= chunkSize) {
            currentChunk += partWithSep;
          } else {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = partWithSep;
          }
        }
        
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        
        // Add overlap between chunks (notebook logic)
        const overlappedChunks: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
          if (i > 0 && overlap > 0) {
            // Add overlap from previous chunk
            const prevChunk = chunks[i - 1];
            if (prevChunk.length > overlap) {
              const overlapText = prevChunk.slice(-overlap) + ' ' + chunks[i];
              overlappedChunks.push(overlapText);
            } else {
              overlappedChunks.push(chunks[i]);
            }
          } else {
            overlappedChunks.push(chunks[i]);
          }
        }
        
        return overlappedChunks;
      }
    }
  }
  
  // Fallback: character-based splitting with overlap
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    const chunk = text.slice(i, i + chunkSize);
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }
  return chunks;
}
