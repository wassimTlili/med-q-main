import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

async function getHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ specialtyId: string }> }
) {
  try {
    const { specialtyId } = await params;

    const specialty = await prisma.specialty.findUnique({
      where: { id: specialtyId },
      include: {
        _count: {
          select: {
            lectures: true
          }
        }
      }
    });

    if (!specialty) {
      return NextResponse.json(
        { error: 'Specialty not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(specialty);
  } catch (error) {
    console.error('Error fetching specialty:', error);
    return NextResponse.json(
      { error: 'Failed to fetch specialty' },
      { status: 500 }
    );
  }
}

async function putHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ specialtyId: string }> }
) {
  try {
    const { specialtyId } = await params;
    const { name, description, icon, niveauId, isFree } = await request.json();

    const specialty = await prisma.specialty.update({
      where: { id: specialtyId },
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

async function deleteHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ specialtyId: string }> }
) {
  try {
    const { specialtyId } = await params;

    await prisma.specialty.delete({
      where: { id: specialtyId }
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
export const PUT = requireAdmin(putHandler);
export const DELETE = requireAdmin(deleteHandler); 