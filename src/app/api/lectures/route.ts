import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

async function getHandler(request: AuthenticatedRequest) {
  try {
    const userId = request.user!.userId;
    const { searchParams } = new URL(request.url);
    const specialtyId = searchParams.get('specialtyId');

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

    // Build the where clause for lectures
    let where: any = {};
    
    if (specialtyId) {
      where.specialtyId = specialtyId;
    }

    // If user is not admin and has a niveau, filter by specialty niveau
    if (user.role !== 'admin' && user.niveauId) {
      where.specialty = {
        niveauId: user.niveauId
      };
    }

    const lectures = await prisma.lecture.findMany({
      where,
      orderBy: [
        { isFree: 'desc' }, // Free content first (true comes before false)
        { title: 'asc' }
      ],
      select: {
        id: true,
        specialtyId: true,
        title: true,
        description: true,
        isFree: true,
        createdAt: true,
        specialty: {
          select: {
            id: true,
            name: true,
            niveauId: true,
            isFree: true,
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
    
    return NextResponse.json(lectures);
  } catch (error) {
    console.error('Error fetching lectures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lectures' },
      { status: 500 }
    );
  }
}

async function postHandler(request: AuthenticatedRequest) {
  try {
    const { title, description, specialtyId } = await request.json();

    if (!title || !specialtyId) {
      return NextResponse.json(
        { error: 'Title and specialtyId are required' },
        { status: 400 }
      );
    }

    const lecture = await prisma.lecture.create({
      data: {
        title,
        description,
        specialtyId
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

    return NextResponse.json(lecture, { status: 201 });
  } catch (error) {
    console.error('Error creating lecture:', error);
    return NextResponse.json(
      { error: 'Failed to create lecture' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAdmin(postHandler); 