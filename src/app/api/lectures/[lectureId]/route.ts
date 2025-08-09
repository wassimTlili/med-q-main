import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

async function getHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ lectureId: string }> }
) {
  try {
    const userId = request.user!.userId;
    const { lectureId } = await params;
    const { searchParams } = new URL(request.url);
    const includeQuestions = searchParams.get('includeQuestions') === 'true';

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

    // Build the where clause for the lecture
    let whereClause: any = { id: lectureId };
    
    // If user is not admin and has a niveau, filter by specialty niveau
    if (user.role !== 'admin' && user.niveauId) {
      whereClause.specialty = {
        niveauId: user.niveauId
      };
    }

    if (includeQuestions) {
      // Optimized query: fetch lecture with questions in a single request
      const lectureWithQuestions = await prisma.lecture.findUnique({
        where: whereClause,
        include: {
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
          },
                      questions: {
              orderBy: [
                { caseNumber: 'asc' },
                { caseQuestionNumber: 'asc' },
                { number: 'asc' },
                { type: 'asc' },
                { id: 'asc' }
              ],
            select: {
              id: true,
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
              createdAt: true
            }
          },
          _count: {
            select: {
              questions: true
            }
          }
        }
      });

      if (!lectureWithQuestions) {
        console.log('Lecture not found with lectureId:', lectureId, 'and whereClause:', whereClause);
        return NextResponse.json(
          { error: 'Lecture not found or access denied' },
          { status: 404 }
        );
      }

      console.log('Lecture found:', {
        id: lectureWithQuestions.id,
        title: lectureWithQuestions.title,
        questionsCount: lectureWithQuestions.questions?.length || 0,
        hasQuestions: !!lectureWithQuestions.questions
      });

      return NextResponse.json(lectureWithQuestions);
    } else {
      // Original query: fetch lecture only
      const lecture = await prisma.lecture.findUnique({
        where: whereClause,
        include: {
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
          },
          _count: {
            select: {
              questions: true
            }
          }
        }
      });

      if (!lecture) {
        return NextResponse.json(
          { error: 'Lecture not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json(lecture);
    }
  } catch (error) {
    console.error('Error fetching lecture:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lecture' },
      { status: 500 }
    );
  }
}

async function putHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ lectureId: string }> }
) {
  try {
    const { lectureId } = await params;
    const { title, description, specialtyId, isFree } = await request.json();

    console.log('Updating lecture:', { lectureId, title, description, specialtyId, isFree });

    const lecture = await prisma.lecture.update({
      where: { id: lectureId },
      data: {
        title,
        description,
        specialtyId,
        isFree
      },
      include: {
        specialty: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log('Updated lecture:', { id: lecture.id, title: lecture.title, isFree: lecture.isFree });

    return NextResponse.json(lecture);
  } catch (error) {
    console.error('Error updating lecture:', error);
    return NextResponse.json(
      { error: 'Failed to update lecture' },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ lectureId: string }> }
) {
  try {
    const { lectureId } = await params;

    await prisma.lecture.delete({
      where: { id: lectureId }
    });

    return NextResponse.json({ message: 'Lecture deleted successfully' });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    return NextResponse.json(
      { error: 'Failed to delete lecture' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAdmin(putHandler);
export const DELETE = requireAdmin(deleteHandler); 