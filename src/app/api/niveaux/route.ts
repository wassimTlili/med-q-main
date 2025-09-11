import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

export const GET = requireAuth(async (_req: AuthenticatedRequest) => {
  const rows = await prisma.niveau.findMany({ select: { id: true, name: true, order: true }, orderBy: { order: 'asc' } });
  return NextResponse.json(rows);
});