import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  context: any
) {
  try {
    const rawId = context.params?.sessionId ?? '';
    const cleanedId = rawId.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug') === '1';

    console.log('[session GET] incoming', { rawId, cleanedId });

  const session = await prisma.session.findUnique({
      where: { id: cleanedId },
      include: {
        specialty: { select: { id: true, name: true } },
        niveau: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true, order: true } }
      }
    });

    if (!session) {
      const sample = await prisma.session.findMany({
        take: 5,
        select: { id: true, name: true, specialtyId: true }
      });
      return NextResponse.json(
        {
          error: 'Session not found',
          requestedId: cleanedId,
          rawId,
          sample,
          envDbUrlPresent: !!process.env.DATABASE_URL,
          totalSessions: await prisma.session.count(),
        },
        { status: 404 }
      );
    }

    if (debug) {
      return NextResponse.json({ session, debug: { fetchedAt: new Date().toISOString() } });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
