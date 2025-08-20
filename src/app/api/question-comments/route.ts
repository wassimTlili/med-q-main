import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { questionCommentsSupportsAnonymous } from '@/lib/db-features';

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

    const supportsAnonymous = await questionCommentsSupportsAnonymous();
    if (supportsAnonymous) {
      // @ts-ignore - prisma delegate is generated
      const comments = await prisma.questionComment.findMany({
        where: { questionId },
        select: {
          id: true,
          content: true,
          isAnonymous: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(comments);
    }
    // Compatibility path without is_anonymous
    // @ts-ignore - prisma delegate is generated
    const comments = await prisma.questionComment.findMany({
      where: { questionId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const withFlag = comments.map((c: any) => ({ ...c, isAnonymous: false }));
    return NextResponse.json(withFlag);
  } catch (error) {
    console.error('Error fetching question comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/question-comments
export async function POST(request: NextRequest) {
  try {
  const { questionId, userId, content, isAnonymous } = await request.json();
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

    const supportsAnonymous = await questionCommentsSupportsAnonymous();
    if (supportsAnonymous) {
      // @ts-ignore - prisma delegate is generated
      const comment = await prisma.questionComment.create({
        data: { questionId, userId, content: String(content).trim(), isAnonymous: !!isAnonymous },
        select: {
          id: true,
          content: true,
          isAnonymous: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
      return NextResponse.json(comment, { status: 201 });
    }
    // Compatibility path without is_anonymous
    const inserted = await prisma.$queryRaw<Array<{ id: string; content: string; created_at: Date; updated_at: Date }>>`
      INSERT INTO question_comments (question_id, user_id, content)
      VALUES (${questionId}::uuid, ${userId}::uuid, ${String(content).trim()})
      RETURNING id::text, content, created_at, updated_at;
    `;
    const row = inserted?.[0];
    if (!row) throw new Error('Insert failed without returning row');

    const userRows = await prisma.$queryRaw<Array<{ id: string; name: string | null; email: string | null; role: string }>>`
      SELECT id::text AS id, name, email, role FROM profiles WHERE id = ${userId}::uuid;
    `;
    const userInfo = userRows?.[0] ?? { id: userId, name: null, email: null, role: 'student' };

    return NextResponse.json({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isAnonymous: false,
      user: userInfo,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating question comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
