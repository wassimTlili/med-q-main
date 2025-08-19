import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content } = await request.json();
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    // @ts-ignore - model available after prisma generate
    const existing = await prisma.questionComment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    // @ts-ignore - model available after prisma generate
    const updated = await prisma.questionComment.update({
      where: { id },
      data: { content: String(content).trim(), updatedAt: new Date() },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating question comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // @ts-ignore - model available after prisma generate
    const existing = await prisma.questionComment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    // @ts-ignore - model available after prisma generate
    await prisma.questionComment.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Error deleting question comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
