import { extractPdfTextPerPage, splitIntoChunks } from '@/lib/pdfExtract';
import { createRagIndex, addChunksToIndex } from '@/lib/services/ragDb';
import fs from 'node:fs/promises';

async function main() {
  const args = process.argv.slice(2);
  const input = args[0];
  if (!input) {
    console.error('Usage: tsx scripts/build-rag-from-pdf.ts <pdfUrlOrLocalPath> [indexName] [niveau=PCEM2] [matiere=...] [cours=...]');
    process.exit(1);
  }
  const indexName = args[1];
  // Parse optional key=value metadata (niveau, matiere, cours)
  const meta: Record<string, any> = { source: input };
  for (let i = 2; i < args.length; i++) {
    const part = args[i];
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim().toLowerCase();
    const v = part.slice(eq + 1).trim();
    if (!v) continue;
    if (['niveau','matiere','cours'].includes(k)) meta[k] = v;
  }
  let buf: ArrayBuffer;
  if (/^https?:\/\//i.test(input)) {
    console.log('Downloading PDF:', input);
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Failed to download PDF: ${res.status}`);
    buf = await res.arrayBuffer();
  } else {
    console.log('Reading local PDF:', input);
  const file = await fs.readFile(input);
  // Convert Node Buffer to ArrayBuffer safely
  const ab = new ArrayBuffer(file.byteLength);
  const view = new Uint8Array(ab);
  view.set(file);
  buf = ab;
  }
  console.log('Extracting text...');
  const pages = await extractPdfTextPerPage(buf);
  const index = await createRagIndex(indexName);
  console.log('Index ID:', index.id);
  if (Object.keys(meta).length > 1) {
    console.log('Meta:', meta);
  }
  const chunks = pages.flatMap((p) => {
    const pieces = splitIntoChunks(p.text, { chunkSize: 800, chunkOverlap: 150 });
    return pieces.map((text, i) => ({ text, page: p.page, ord: i, meta }));
  });
  console.log(`Embedding ${chunks.length} chunks...`);
  await addChunksToIndex(index.id, chunks);
  console.log('Done. Index ID:', index.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
