import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

async function getHandler(request: AuthenticatedRequest) {
  const url = new URL(request.url);
  const semesterParam = url.searchParams.get('semester'); // 'none' | <semesterId>
  const items = await (prisma as any).session.findMany({
    where: {
      ...(request.user?.role !== 'admin' && request.user?.userId
        ? await (async () => {
            const user = await prisma.user.findUnique({ where: { id: request.user!.userId }, select: { niveauId: true } });
            return user?.niveauId ? { niveauId: user.niveauId } : {};
          })()
        : {}),
      ...(semesterParam
        ? semesterParam === 'none'
          ? { semesterId: null }
          : { semesterId: semesterParam }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    select: { id: true, name: true, pdfUrl: true, correctionUrl: true, niveauId: true, semesterId: true, createdAt: true, niveau: { select: { id: true, name: true } }, semester: { select: { id: true, name: true, order: true } } }
  });
  return NextResponse.json(items);
}

async function postHandler(request: AuthenticatedRequest) {
  const body = await request.json();
  const { name, pdfUrl, correctionUrl, niveauId } = body as { name: string; pdfUrl?: string; correctionUrl?: string; niveauId?: string };
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const created = await (prisma as any).session.create({ data: { name, pdfUrl, correctionUrl, niveauId } });
  return NextResponse.json(created, { status: 201 });
}

export const GET = requireAuth(getHandler);
export const POST = requireAdmin(postHandler);
