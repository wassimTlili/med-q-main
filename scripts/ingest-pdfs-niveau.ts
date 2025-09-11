import path from 'node:path';
import fs from 'node:fs/promises';
import { createRagIndex, addChunksToIndex } from '@/lib/services/ragDb';
import { extractPdfTextPerPage, splitIntoChunks } from '@/lib/pdfExtract';

/*
 * Batch ingest PDFs with optional matiere subfolders.
 * Accepted layouts:
 *   PDFs/<NIVEAU>/*.pdf  (matiere inferred as <NIVEAU>)
 *   PDFs/<NIVEAU>/<MATIERE>/*.pdf  (matiere taken from subfolder name)
 * Usage: npm run rag:ingest-pdfs
 * Optional env overrides:
 *  CHUNK_SIZE (default 800)
 *  CHUNK_OVERLAP (default 300, increased to match notebook)
 */
async function fileToArrayBuffer(fp: string): Promise<ArrayBuffer> {
  const b = await fs.readFile(fp);
  const ab = new ArrayBuffer(b.byteLength);
  new Uint8Array(ab).set(b);
  return ab;
}

async function ingestPdf(fullPath: string, rel: string, niveau: string, matiere: string, chunkSize: number, chunkOverlap: number) {
  console.log(`→ Ingesting ${rel}`);
  const buf = await fileToArrayBuffer(fullPath);
  const pages = await extractPdfTextPerPage(buf);
  const baseNameNoExt = path.basename(rel).replace(/\.pdf$/i,'');
  // Index name: <niveau>__<matiere>__<filename> to avoid collisions & allow grouping
  const index = await createRagIndex(`${niveau}__${matiere}__${baseNameNoExt}`);
  const metaBase = { source: rel.replace(/\\/g,'/'), niveau, matiere } as Record<string, any>;
  const chunks = pages.flatMap(p => {
    const pieces = splitIntoChunks(p.text, { chunkSize, chunkOverlap });
    return pieces.map((text,i) => ({ text, page: p.page, ord: i, meta: metaBase }));
  });
  console.log(`  Chunks: ${chunks.length}`);
  await addChunksToIndex(index.id, chunks);
  console.log(`  Index ID: ${index.id}`);
  return { id: index.id, rel, niveau, matiere, chunks: chunks.length };
}

async function main() {
  const root = path.resolve(process.cwd(), 'PDFs');
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  if (!entries.length) {
    console.error('No niveau folders found under PDFs/.');
    process.exit(1);
  }
  const chunkSize = Number(process.env.CHUNK_SIZE || 800);
  const chunkOverlap = Number(process.env.CHUNK_OVERLAP || 300); // Match notebook default
  const results: any[] = [];
  for (const dir of entries) {
    if (!dir.isDirectory()) continue;
    const niveau = dir.name;
    const niveauDir = path.join(root, niveau);
    const niveauEntries = await fs.readdir(niveauDir, { withFileTypes: true }).catch(() => []);
    const directPdfs = niveauEntries.filter(e => e.isFile() && e.name.toLowerCase().endsWith('.pdf'));
    const subDirs = niveauEntries.filter(e => e.isDirectory());

    // Ingest direct PDFs (matiere = niveau)
    if (directPdfs.length) {
      console.log(`Niveau ${niveau} (no matiere subfolders for these): ${directPdfs.length} PDF(s)`);
      for (const p of directPdfs) {
        const fp = path.join(niveauDir, p.name);
        const rel = path.relative(root, fp);
        try {
          const r = await ingestPdf(fp, rel, niveau, niveau, chunkSize, chunkOverlap);
          results.push(r);
        } catch (e: any) {
          console.error(`  Error ingesting ${rel}: ${e?.message || e}`);
        }
      }
    }

    // Ingest PDFs inside matiere subfolders
    for (const sd of subDirs) {
      const matiere = sd.name;
      const matDir = path.join(niveauDir, matiere);
      const matFiles = (await fs.readdir(matDir, { withFileTypes: true })).filter(f => f.isFile() && f.name.toLowerCase().endsWith('.pdf'));
      if (!matFiles.length) continue;
      console.log(`Niveau ${niveau} / Matiere ${matiere}: ${matFiles.length} PDF(s)`);
      for (const p of matFiles) {
        const fp = path.join(matDir, p.name);
        const rel = path.relative(root, fp);
        try {
          const r = await ingestPdf(fp, rel, niveau, matiere, chunkSize, chunkOverlap);
          results.push(r);
        } catch (e: any) {
          console.error(`  Error ingesting ${rel}: ${e?.message || e}`);
        }
      }
    }

    if (!directPdfs.length && !subDirs.length) {
      console.log(`(skip) ${niveau}: no PDFs`);
    }
  }
  console.log('\nSummary:');
  for (const r of results) {
    console.log(` - ${r.rel} (niveau=${r.niveau}, matiere=${r.matiere}) -> ${r.id} (${r.chunks} chunks)`);
  }
  console.log('\nSet one index ID in .env.local as RAG_INDEX_ID=... to enable contextual AI corrections.');
}

main().catch(e => { console.error(e); process.exit(1); });
