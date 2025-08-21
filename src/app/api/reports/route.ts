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
    const { searchParams } = new URL(request.url);
    const lectureId = searchParams.get('lectureId');
    const questionId = searchParams.get('questionId');
  const status = searchParams.get('status');
  const typeParam = searchParams.get('type');

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

    const where: Record<string, unknown> = {};
    if (lectureId) where.lectureId = lectureId;
    if (questionId) where.questionId = questionId;
    if (status) where.status = status;
    if (typeParam) {
      // Accept friendly values and map to enum
      const t = typeParam.toLowerCase();
      const map: Record<string, string> = {
        'mal_placee': 'mal_placee',
        'mal-placée': 'mal_placee',
        'mal placée': 'mal_placee',
        'misplaced': 'mal_placee',
        'erreur_syntaxe': 'erreur_syntaxe',
        'erreur syntaxe': 'erreur_syntaxe',
        'syntax': 'erreur_syntaxe',
        'autre': 'autre',
        'other': 'autre'
      };
      const mapped = map[t] || t;
      (where as any).reportType = mapped;
    }

    // If user is not admin and has a niveau, filter by specialty niveau
    if (user.role !== 'admin' && user.niveauId) {
      where.lecture = {
        specialty: {
          niveauId: user.niveauId
        }
      };
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
  question: {
          select: {
            id: true,
            text: true,
            type: true
          }
        },
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
        },
  user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
    
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

async function postHandler(request: AuthenticatedRequest) {
  try {
  const { questionId, lectureId, message, reportType } = await request.json();
    const userId = request.user?.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

  if (!questionId || !lectureId || !message) {
      return NextResponse.json(
        { error: 'questionId, lectureId, and message are required' },
        { status: 400 }
      );
    }

  const report = await (prisma as any).report.create({
      data: {
        questionId,
        lectureId,
  message,
    // default handled by prisma schema if not provided
    reportType: reportType ?? undefined,
        userId,
        status: 'pending'
      },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            type: true
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
            email: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler); 