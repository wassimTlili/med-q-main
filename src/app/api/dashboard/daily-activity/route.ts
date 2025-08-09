import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

async function getHandler(request: AuthenticatedRequest) {
  try {
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

    // Build where clause for user's niveau
    let whereClause: any = { userId };

    if (user.role !== 'admin' && user.niveauId) {
      whereClause.lecture = {
        specialty: {
          niveauId: user.niveauId
        }
      };
    }

    // Get the last 7 days
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    // Add date range to where clause
    whereClause.lastAccessed = {
      gte: startDate,
      lte: endDate
    };

    // Get user progress data for the last 7 days
    const progressData = await prisma.userProgress.findMany({
      where: whereClause,
      select: {
        lastAccessed: true
      }
    });

    // Generate data for the last 7 days
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dateString = date.toISOString().split('T')[0];
      
      // Count questions answered on this date
      const questionsOnDate = progressData.filter(p => {
        const progressDate = new Date(p.lastAccessed);
        progressDate.setHours(0, 0, 0, 0);
        return progressDate.getTime() === date.getTime();
      }).length;

      dailyData.push({
        date: dateString,
        questions: questionsOnDate
      });
    }

    return NextResponse.json(dailyData);
  } catch (error) {
    console.error('Error fetching daily activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily activity' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler); 