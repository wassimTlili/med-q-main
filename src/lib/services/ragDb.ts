import { prisma } from '@/lib/prisma';
import { embedTexts } from './azureOpenAI';

// Simple sleep helper
function wait(ms: number) { return new Promise(res => setTimeout(res, ms)); }

export async function createRagIndex(name?: string) {
  const p = prisma as any; // use any to avoid type errors before Prisma generate
  return p.ragIndex.create({ data: { name: name || null } });
}

export async function addChunksToIndex(indexId: string, chunks: { text: string; page?: number; ord?: number; meta?: any }[]) {
  if (!chunks.length) return;
  const batchSize = Math.max(1, Number(process.env.EMBEDDING_BATCH_SIZE || 64));
  const maxAttempts = Math.max(1, Number(process.env.EMBEDDING_RETRY_ATTEMPTS || 5));
  const baseDelay = Math.max(100, Number(process.env.EMBEDDING_RETRY_BASE_MS || 500));

  const texts = chunks.map(c => c.text);
  const embeddings: number[][] = new Array(texts.length);

  for (let start = 0; start < texts.length; start += batchSize) {
    const end = Math.min(start + batchSize, texts.length);
    const slice = texts.slice(start, end);
    let attempt = 0;
    while (true) {
      try {
        attempt++;
        const vecs = await embedTexts(slice);
        if (vecs.length !== slice.length) throw new Error(`Embedding count mismatch: got ${vecs.length} expected ${slice.length}`);
        for (let i = 0; i < vecs.length; i++) embeddings[start + i] = vecs[i];
        if (attempt > 1) {
          // eslint-disable-next-line no-console
          console.log(`Embedding batch ${start}-${end - 1} succeeded after retry #${attempt - 1}`);
        }
        break;
      } catch (e: any) {
        const msg = e?.message || String(e);
        const transient = /503|timeout|Temporary|temporarily|ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed/i.test(msg);
        if (!transient || attempt >= maxAttempts) {
          throw new Error(`Failed embedding batch ${start}-${end - 1} after ${attempt} attempt(s): ${msg}`);
        }
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 200;
        // eslint-disable-next-line no-console
        console.warn(`Retry ${attempt}/${maxAttempts - 1} for embedding batch ${start}-${end - 1} in ${Math.round(delay)}ms (reason: ${msg})`);
        await wait(delay);
      }
    }
  }

  const p = prisma as any;
  await p.$transaction(
    chunks.map((c, i) =>
      p.ragChunk.create({
        data: {
          indexId,
          text: c.text,
          page: c.page ?? null,
          ord: c.ord ?? null,
          meta: c.meta ?? null,
          embedding: embeddings[i] as unknown as number[],
        },
      })
    )
  );
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  const denom = Math.sqrt(na)*Math.sqrt(nb) || 1;
  return dot / denom;
}

export async function searchIndex(indexId: string, query: string, k = 8) {
  const qVec = (await embedTexts([query]))[0];
  const p = prisma as any;
  const rows = await p.ragChunk.findMany({
    where: { indexId },
    select: { id: true, text: true, page: true, ord: true, meta: true, embedding: true },
  }) as Array<{ id: string; text: string; page: number | null; ord: number | null; meta: any; embedding: number[] }>;
  const scored: Array<{ row: { id: string; text: string; page: number | null; ord: number | null; meta: any; embedding: number[] }; s: number }> =
    rows.map((r) => ({ row: r, s: cosine(qVec, r.embedding as unknown as number[]) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map(({ row, s }) => ({ id: row.id, text: row.text, page: row.page ?? undefined, ord: row.ord ?? undefined, meta: row.meta ?? undefined, score: s }));
}
