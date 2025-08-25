import { NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
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
    const whereClause: Record<string, unknown> = { userId };

    if (user.role !== 'admin' && user.niveauId) {
      whereClause.lecture = {
        specialty: {
          niveauId: user.niveauId
        }
      };
    }

  // Support variable window (?days=7|14|30|60|90) default 7
  const { searchParams } = new URL(request.url);
  const daysParam = parseInt(searchParams.get('days') || '7', 10);
  const allowed = [7,14,30,60,90];
  const windowDays = allowed.includes(daysParam) ? daysParam : 7;
  const debug = searchParams.get('debug') === '1';

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (windowDays - 1));
  startDate.setHours(0, 0, 0, 0);

    // Add date range to where clause
    whereClause.lastAccessed = {
      gte: startDate,
      lte: endDate
    };

    // Primary source: UserActivity events (your existing data)
    const activityEvents = await prisma.userActivity.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate }
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    // Secondary: questionUserData updates (if no events recorded yet)
    let questionData: { updatedAt: Date }[] = [];
    if (activityEvents.length === 0) {
      questionData = await prisma.questionUserData.findMany({
        where: {
          userId,
          updatedAt: { gte: startDate, lte: endDate },
          ...(user.role !== 'admin' && user.niveauId ? {
            question: { lecture: { specialty: { niveauId: user.niveauId } } }
          } : {})
        },
        select: { updatedAt: true }
      });
    }

    // Fallback: userProgress if still nothing
    let progressData: { lastAccessed: Date }[] = [];
    if (activityEvents.length === 0 && questionData.length === 0) {
      progressData = await prisma.userProgress.findMany({
        where: whereClause,
        select: { lastAccessed: true }
      });
    }

    // Helper to produce a LOCAL day key (previously we used toISOString which shifted forward users in +TZ back one day)
    const dayKey = (d: Date) => {
      const local = new Date(d);
      local.setHours(0,0,0,0);
      // Normalize by removing timezone offset so the date portion reflects local day
      const adjusted = new Date(local.getTime() - local.getTimezoneOffset() * 60000);
      return adjusted.toISOString().split('T')[0];
    };

    // Build a map dateString -> count (inclusive of today, using local day keys)
    const counts: Record<string, number> = {};
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      counts[dayKey(d)] = 0;
    }

    const increment = (dt: Date) => {
      const key = dayKey(dt);
      if (counts[key] !== undefined) counts[key] += 1;
    };

    // Always prioritize UserActivity (since you have data there)
    // Force use of userActivity data regardless of count
    const useActivityEvents = true; // Force this since you have data
    
    if (useActivityEvents) {
      activityEvents.forEach((a: any) => increment(a.createdAt));
    } else if (questionData.length) {
      questionData.forEach(q => increment(q.updatedAt));
    } else {
      progressData.forEach(p => increment(p.lastAccessed));
    }

    const dailyData = Object.entries(counts)
      .map(([date, questions]) => ({ date, questions }))
      .sort((a, b) => a.date.localeCompare(b.date)); // Ensure chronological order
    
    const totalEvents = dailyData.reduce((a,c)=> a + c.questions, 0);

    if (debug) {
      return NextResponse.json({
        windowDays,
        dailyData,
        source: useActivityEvents ? 'userActivity' : (questionData.length ? 'questionUserData' : 'userProgress'),
        activityEventsCount: activityEvents.length,
        questionDataCount: questionData.length,
        progressDataCount: progressData.length,
        totalEvents,
        serverNow: new Date().toISOString(),
        tzOffsetMinutes: new Date().getTimezoneOffset(),
        note: 'Dates are local-day keys (was UTC ISO previously)'
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