import { NextResponse } from 'next/server';
import { createRagIndex, addChunksToIndex } from '@/lib/services/ragDb';
import { extractPdfTextPerPage, splitIntoChunks } from '@/lib/pdfExtract';

export const runtime = 'nodejs';

type BuildRequest = {
  pdfUrl: string;
  indexName?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  niveau?: string;
  matiere?: string;
  cours?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BuildRequest;
    if (!body?.pdfUrl) {
      return NextResponse.json({ error: 'pdfUrl is required' }, { status: 400 });
    }
    const res = await fetch(body.pdfUrl);
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to download PDF (${res.status})` }, { status: 400 });
    }
    const buf = await res.arrayBuffer();
    const pages = await extractPdfTextPerPage(buf);
    const index = await createRagIndex(body.indexName);
    const baseMeta: Record<string, any> = { source: body.pdfUrl };
    if (body.niveau) baseMeta.niveau = body.niveau;
    if (body.matiere) baseMeta.matiere = body.matiere;
    if (body.cours) baseMeta.cours = body.cours;
    const chunks = pages.flatMap((p) => {
      const pieces = splitIntoChunks(p.text, { chunkSize: body.chunkSize, chunkOverlap: body.chunkOverlap });
      return pieces.map((text, i) => ({ text, page: p.page, ord: i, meta: baseMeta }));
    });
    await addChunksToIndex(index.id, chunks);
  return NextResponse.json({ indexId: index.id, name: index.name ?? null, pages: pages.length, chunks: chunks.length, meta: baseMeta });
  } catch (err: any) {
    const msg = String(err?.message || err);
    // Helpful hint if tables are missing
    const hint = /relation .*rag_/i.test(msg) ? 'Database tables missing. Run Prisma migrations to create RagIndex/RagChunk.' : undefined;
    return NextResponse.json({ error: msg, hint }, { status: 500 });
  }
}
