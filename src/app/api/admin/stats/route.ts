import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

async function getHandler(request: AuthenticatedRequest) {
  try {
    // Get current date for time-based queries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all stats in parallel for better performance
    const [
      specialtiesCount,
      lecturesCount,
      questionsCount,
      usersCount,
      pendingReportsCount,
      recentUsers,
      recentQuestions,
      recentLectures,
      recentReports,
      totalProgressEntries,
      recentProgressEntries,
      averageCompletionRate
    ] = await Promise.all([
      // Basic counts
      prisma.specialty.count(),
      prisma.lecture.count(),
      prisma.question.count(),
      prisma.user.count(),
      
      // Pending reports
      prisma.report.count({
        where: { status: 'pending' }
      }),
      
      // Recent users (last 7 days)
      prisma.user.findMany({
        where: {
          createdAt: { gte: thisWeek }
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          role: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // Recent questions (last 7 days)
      prisma.question.findMany({
        where: {
          createdAt: { gte: thisWeek }
        },
        select: {
          id: true,
          text: true,
          type: true,
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
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // Recent lectures (last 7 days)
      prisma.lecture.findMany({
        where: {
          createdAt: { gte: thisWeek }
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          specialty: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // Recent reports (last 7 days)
      prisma.report.findMany({
        where: {
          createdAt: { gte: thisWeek }
        },
        select: {
          id: true,
          message: true,
          status: true,
          createdAt: true,
          question: {
            select: {
              id: true,
              text: true
            }
          },
          lecture: {
            select: {
              id: true,
              title: true
            }
          },
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // Total progress entries
      prisma.userProgress.count(),
      
      // Recent progress entries (last 7 days)
      prisma.userProgress.count({
        where: {
          createdAt: { gte: thisWeek }
        }
      }),
      
      // Average completion rate (questions completed vs total questions)
      prisma.userProgress.aggregate({
        where: {
          completed: true,
          questionId: { not: null }
        },
        _count: {
          id: true
        }
      }).then(result => {
        const completedQuestions = result._count.id;
        return prisma.question.count().then(totalQuestions => {
          return totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;
        });
      })
    ]);

    const stats = {
      // Basic counts
      specialties: specialtiesCount,
      lectures: lecturesCount,
      questions: questionsCount,
      users: usersCount,
      pendingReports: pendingReportsCount,
      
      // Recent activity
      recentUsers,
      recentQuestions,
      recentLectures,
      recentReports,
      
      // Engagement metrics
      totalProgressEntries,
      recentProgressEntries,
      averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
      
      // Time-based metrics
      usersThisWeek: recentUsers.length,
      questionsThisWeek: recentQuestions.length,
      lecturesThisWeek: recentLectures.length,
      reportsThisWeek: recentReports.length
    };

    const response = NextResponse.json(stats);
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'private, max-age=60'); // 1 minute cache
    response.headers.set('ETag', `"${Date.now()}"`);
    
    return response;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}

export const GET = requireAdmin(getHandler); 