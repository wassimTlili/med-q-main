import { NextResponse } from 'next/server';
import { searchIndex } from '@/lib/services/ragDb';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { indexId: string; query: string; k?: number };
    if (!body?.indexId || !body?.query) {
      return NextResponse.json({ error: 'indexId and query are required' }, { status: 400 });
    }
    const results = await searchIndex(body.indexId, body.query, body.k ?? 8);
    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
