import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

async function getHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const userId = request.user!.userId;
    const { questionId } = await params;

    // Get user with their niveau information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        role: true, 
        niveauId: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build the where clause for the question
    let whereClause: any = { id: questionId };
    
    // If user is not admin and has a niveau, filter by specialty niveau
    if (user.role !== 'admin' && user.niveauId) {
      whereClause.lecture = {
        specialty: {
          niveauId: user.niveauId
        }
      };
    }

    const question = await prisma.question.findUnique({
      where: whereClause,
      select: {
        id: true,
        lectureId: true,
        type: true,
        text: true,
        options: true,
        correctAnswers: true,
        explanation: true,
        courseReminder: true,
        number: true,
        session: true,
        mediaUrl: true,
        mediaType: true,
        caseNumber: true,
        caseText: true,
        caseQuestionNumber: true,
        createdAt: true,
        lecture: {
          select: {
            id: true,
            title: true,
            specialty: {
              select: {
                id: true,
                name: true,
                niveauId: true,
                niveau: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}

async function putHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const {
      type,
      text,
      options,
      correctAnswers,
      explanation,
      courseReminder,
      number,
      session,
      mediaUrl,
      mediaType,
      caseNumber,
      caseText,
      caseQuestionNumber
    } = await request.json();

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        type,
        text,
        options,
        correctAnswers,
        explanation,
        courseReminder,
        number,
        session,
        mediaUrl,
        mediaType,
        caseNumber,
        caseText,
        caseQuestionNumber
      },
      select: {
        id: true,
        lectureId: true,
        type: true,
        text: true,
        options: true,
        correctAnswers: true,
        explanation: true,
        courseReminder: true,
        number: true,
        session: true,
        mediaUrl: true,
        mediaType: true,
        caseNumber: true,
        caseText: true,
        caseQuestionNumber: true,
        createdAt: true,
        lecture: {
          select: {
            id: true,
            title: true,
            specialty: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Note: Cache invalidation is handled by the client-side hook
    // The useLecture hook will clear its cache when needed

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;

    await prisma.question.delete({
      where: { id: questionId }
    });

    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAdmin(putHandler);
export const DELETE = requireAdmin(deleteHandler); 