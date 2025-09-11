import path from 'node:path';
import fs from 'node:fs/promises';
import { extractPdfTextPerPage, splitIntoChunks } from '@/lib/pdfExtract';
import { createRagIndex, addChunksToIndex } from '@/lib/services/ragDb';

/*
Batch ingest PDFs under PDFs/<niveau>/<matiere?>/*.pdf
Usage:
  tsx scripts/ingest-pdfs-folder.ts [root=PDFs] [--dry]
Environment: Azure OpenAI + DB configured.
Metadata stored: { source: relativePath, niveau, matiere, cours: filenameBase }
*/

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.isFile() && /\.pdf$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function parseMeta(root: string, file: string) {
  const rel = path.relative(root, file).replace(/\\/g,'/');
  const parts = rel.split('/');
  const niveau = parts[0] || 'UNKNOWN';
  let matiere = 'General';
  let filename = path.basename(file, path.extname(file));
  if (parts.length >= 3) {
    matiere = parts[1];
  } else if (parts.length >= 2) {
    // No explicit matiere folder: use niveau as fallback
    matiere = niveau;
  }
  return { rel, niveau, matiere, cours: filename };
}

async function ingestOne(file: string, meta: { rel: string; niveau: string; matiere: string; cours: string }, dry: boolean) {
  console.log(`\n>>> ${file}`);
  console.log('Meta:', meta);
  if (dry) { console.log('[dry] skip embedding'); return; }
  const bufNode = await fs.readFile(file);
  // Convert Buffer to ArrayBuffer
  const ab = new ArrayBuffer(bufNode.byteLength); new Uint8Array(ab).set(bufNode);
  const pages = await extractPdfTextPerPage(ab);
  const index = await createRagIndex(meta.cours);
  const chunks = pages.flatMap(p => {
    const pieces = splitIntoChunks(p.text, { chunkSize: 800, chunkOverlap: 150 });
    return pieces.map((text, i) => ({ text, page: p.page, ord: i, meta: { source: meta.rel, niveau: meta.niveau, matiere: meta.matiere, cours: meta.cours } }));
  });
  console.log(`Chunks: ${chunks.length} (embedding…)`);
  await addChunksToIndex(index.id, chunks);
  console.log(`Done indexId=${index.id}`);
  return index.id;
}

async function main() {
  const args = process.argv.slice(2);
  const root = args[0] && !args[0].startsWith('--') ? args[0] : 'PDFs';
  const dry = args.includes('--dry');
  console.log('Root:', root, dry ? '(dry run)' : '');
  const absRoot = path.resolve(process.cwd(), root);
  try { await fs.access(absRoot); } catch { console.error('Root folder not found:', absRoot); process.exit(1); }
  const files = await walk(absRoot);
  if (!files.length) { console.log('No PDFs found.'); return; }
  console.log(`Found ${files.length} PDF(s).`);
  const summary: Array<{ file: string; indexId?: string; error?: string }> = [];
  for (const f of files) {
    const meta = parseMeta(absRoot, f);
    try {
      const id = await ingestOne(f, meta, dry);
      summary.push({ file: meta.rel, indexId: id });
    } catch (e: any) {
      console.error('Error ingesting', f, e?.message || e);
      summary.push({ file: meta.rel, error: e?.message || String(e) });
    }
  }
  console.log('\nSUMMARY');
  for (const s of summary) {
    if (s.error) console.log('✗', s.file, '=>', s.error);
    else console.log('✔', s.file, '=>', s.indexId);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
