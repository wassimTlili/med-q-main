import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const pinnedQuestions = await prisma.pinnedQuestion.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            type: true,
            number: true,
            session: true
          }
        }
      }
    });

    return NextResponse.json(pinnedQuestions);
  } catch (error) {
    console.error('Error fetching pinned questions:', error);
    return NextResponse.json({ error: 'Failed to fetch pinned questions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, questionId } = await request.json();

    if (!userId || !questionId) {
      return NextResponse.json({ error: 'User ID and Question ID are required' }, { status: 400 });
    }

    // Check if already pinned
    const existingPin = await prisma.pinnedQuestion.findUnique({
      where: {
        userId_questionId: {
          userId,
          questionId
        }
      }
    });

    if (existingPin) {
      return NextResponse.json({ message: 'Question already pinned' }, { status: 200 });
    }

    const pinnedQuestion = await prisma.pinnedQuestion.create({
      data: {
        userId,
        questionId
      }
    });

    return NextResponse.json(pinnedQuestion, { status: 201 });
  } catch (error) {
    console.error('Error pinning question:', error);
    return NextResponse.json({ error: 'Failed to pin question' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const questionId = searchParams.get('questionId');

    if (!userId || !questionId) {
      return NextResponse.json({ error: 'User ID and Question ID are required' }, { status: 400 });
    }

    await prisma.pinnedQuestion.delete({
      where: {
        userId_questionId: {
          userId,
          questionId
        }
      }
    });

    return NextResponse.json({ message: 'Question unpinned successfully' });
  } catch (error) {
    console.error('Error unpinning question:', error);
    return NextResponse.json({ error: 'Failed to unpin question' }, { status: 500 });
  }
}
