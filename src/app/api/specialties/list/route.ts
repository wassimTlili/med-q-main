import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';

export const GET = requireAdmin(async (_req: AuthenticatedRequest) => {
  const rows = await prisma.specialty.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  return NextResponse.json(rows);
});
