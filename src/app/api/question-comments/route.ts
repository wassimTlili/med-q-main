import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/question-comments?questionId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');
    if (!questionId) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    // Ensure question exists
    const exists = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

  // @ts-ignore - model available after prisma generate
  const comments = await prisma.questionComment.findMany({
      where: { questionId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching question comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/question-comments
export async function POST(request: NextRequest) {
  try {
    const { questionId, userId, content } = await request.json();
    if (!questionId || !userId || !content) {
      return NextResponse.json({ error: 'questionId, userId and content are required' }, { status: 400 });
    }

    // Verify question and user
    const [question, user] = await Promise.all([
      prisma.question.findUnique({ where: { id: questionId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    ]);
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // @ts-ignore - model available after prisma generate
  const comment = await prisma.questionComment.create({
      data: { questionId, userId, content: String(content).trim() },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating question comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
