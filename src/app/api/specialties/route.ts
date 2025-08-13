import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

async function getHandler(request: AuthenticatedRequest) {
  try {
    const userId = request.user?.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with their niveau information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        role: true, 
        niveauId: true,
        niveau: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log('User data for specialties API:', {
      userId,
      user: user,
      hasNiveau: !!user?.niveauId
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build the where clause for specialties
    const whereClause: Record<string, unknown> = {};
    
    // If user is not admin and has a niveau, filter by niveau
    if (user.role !== 'admin' && user.niveauId) {
      whereClause.niveauId = user.niveauId;
      console.log('Filtering specialties by niveauId:', user.niveauId);
    } else {
      console.log('Not filtering by niveau - user role:', user.role, 'niveauId:', user.niveauId);
    }

    // For now, we'll implement subscription logic in the frontend
    // Later we can add proper subscription checking here

    // Use aggregation queries for better performance
    const specialtiesWithStats = await prisma.specialty.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        createdAt: true,
        niveauId: true,
        isFree: true,
        niveau: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            lectures: true
          }
        },
        lectures: {
          select: {
            id: true,
            _count: {
              select: {
                questions: true
              }
            },
            progress: {
              where: {
                userId: userId,
                questionId: null // Only lecture-level progress
              },
              select: {
                completed: true
              }
            }
          }
        }
      },
      orderBy: [
        { isFree: 'desc' }, // Free content first (true comes before false)
        { name: 'asc' }
      ]
    });

    // Get user progress for questions across all specialties in a single query
    const userQuestionProgress = await prisma.userProgress.groupBy({
      by: ['lectureId'],
      where: {
        userId: userId,
        questionId: {
          not: null
        }
      },
      _count: {
        questionId: true
      },
      _sum: {
        score: true
      }
    });

    // Create a map for quick lookup
    const progressMap = new Map(
      userQuestionProgress.map(p => [p.lectureId, { count: p._count.questionId, score: p._sum.score }])
    );

        // Calculate progress for each specialty  
        const specialtiesWithProgress = specialtiesWithStats.map(specialty => {
          let totalQuestions = 0;
          let completedLectures = 0;
          let completedQuestions = 0;
          let totalScore = 0;

          specialty.lectures.forEach(lecture => {
            totalQuestions += lecture._count.questions;
            
            // Check if lecture is completed
            if (lecture.progress.length > 0 && lecture.progress[0].completed) {
              completedLectures++;
            }

            // Add question-level progress
            const questionProgress = progressMap.get(lecture.id);
            if (questionProgress) {
              completedQuestions += questionProgress.count;
              totalScore += questionProgress.score || 0;
            }
          });

          const totalLectures = specialty._count.lectures;
          const lectureProgress = totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0;
          const questionProgress = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;
          const averageScore = completedQuestions > 0 ? (totalScore / completedQuestions) * 100 : 0;

          return {
            id: specialty.id,
            name: specialty.name,
            description: specialty.description,
            icon: specialty.icon,
            createdAt: specialty.createdAt,
            niveauId: specialty.niveauId,
            isFree: specialty.isFree,
            niveau: specialty.niveau,
            _count: {
              lectures: totalLectures,
              questions: totalQuestions
            },
            progress: {
              totalLectures,
              completedLectures,
              totalQuestions,
              completedQuestions,
              lectureProgress: Math.round(lectureProgress),
              questionProgress: Math.round(questionProgress),
              averageScore: Math.round(averageScore),
              // Add detailed progress for color-coded progress bars
              correctQuestions: Math.round(completedQuestions * 0.7), // Estimate
              incorrectQuestions: Math.round(completedQuestions * 0.2), // Estimate  
              partialQuestions: Math.round(completedQuestions * 0.1), // Estimate
              incompleteQuestions: totalQuestions - completedQuestions
            }
          };
        });

    console.log('Found specialties:', {
      total: specialtiesWithProgress.length,
      whereClause,
      specialtyNames: specialtiesWithProgress.map(s => s.name)
    });

    const response = NextResponse.json(specialtiesWithProgress);
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'private, max-age=300'); // 5 minutes
    response.headers.set('ETag', `"${Date.now()}"`);
    
    return response;
  } catch (error) {
    console.error('Error fetching specialties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch specialties' },
      { status: 500 }
    );
  }
}

async function postHandler(request: AuthenticatedRequest) {
  try {
    const { name, description, icon, niveauId, isFree } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const specialty = await prisma.specialty.create({
      data: {
        name,
        description,
        icon,
        niveauId,
        isFree: isFree || false
      }
    });

    return NextResponse.json(specialty);
  } catch (error) {
    console.error('Error creating specialty:', error);
    return NextResponse.json(
      { error: 'Failed to create specialty' },
      { status: 500 }
    );
  }
}

async function putHandler(request: AuthenticatedRequest) {
  try {
    const { id, name, description, icon, niveauId, isFree } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Specialty ID is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const specialty = await prisma.specialty.update({
      where: { id },
      data: {
        name,
        description,
        icon,
        niveauId,
        isFree
      }
    });

    return NextResponse.json(specialty);
  } catch (error) {
    console.error('Error updating specialty:', error);
    return NextResponse.json(
      { error: 'Failed to update specialty' },
      { status: 500 }
    );
  }
}

async function deleteHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Specialty ID is required' },
        { status: 400 }
      );
    }

    // Check if specialty has lectures
    const lectureCount = await prisma.lecture.count({
      where: { specialtyId: id }
    });

    if (lectureCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete specialty with existing lectures' },
        { status: 400 }
      );
    }

    await prisma.specialty.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Specialty deleted successfully' });
  } catch (error) {
    console.error('Error deleting specialty:', error);
    return NextResponse.json(
      { error: 'Failed to delete specialty' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAdmin(postHandler);
export const PUT = requireAdmin(putHandler);
export const DELETE = requireAdmin(deleteHandler); 