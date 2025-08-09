import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

async function postHandler(request: AuthenticatedRequest) {
  try {
    const { lectureId, questionId, completed, score } = await request.json();
    const userId = request.user!.userId;

    if (!lectureId) {
      return NextResponse.json(
        { error: 'Lecture ID is required' },
        { status: 400 }
      );
    }

    // Optimized upsert with minimal data selection
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_lectureId_questionId: {
          userId,
          lectureId,
          questionId: questionId || null
        }
      },
      update: {
        completed: completed ?? true,
        score: score,
        lastAccessed: new Date()
      },
      create: {
        userId,
        lectureId,
        questionId: questionId || null,
        completed: completed ?? true,
        score: score,
        lastAccessed: new Date()
      },
      select: {
        id: true,
        completed: true,
        score: true,
        lastAccessed: true
      }
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

async function getHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lectureId = searchParams.get('lectureId');
    const specialtyId = searchParams.get('specialtyId');
    const userId = request.user!.userId;

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

    let whereClause: any = { userId };

    if (lectureId) {
      whereClause.lectureId = lectureId;
    }

    if (specialtyId) {
      // Get all lectures for this specialty
      const lectures = await prisma.lecture.findMany({
        where: { specialtyId },
        select: { id: true }
      });
      whereClause.lectureId = { in: lectures.map(l => l.id) };
    }

    // If user is not admin and has a niveau, filter by specialty niveau
    if (user.role !== 'admin' && user.niveauId) {
      whereClause.lecture = {
        specialty: {
          niveauId: user.niveauId
        }
      };
    }

    const progress = await prisma.userProgress.findMany({
      where: whereClause,
      include: {
        lecture: {
          select: {
            id: true,
            title: true,
            specialtyId: true,
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

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(postHandler);
export const GET = requireAuth(getHandler); 