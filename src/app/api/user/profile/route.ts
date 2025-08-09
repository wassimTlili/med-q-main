import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../../../../lib/auth-middleware';

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, sexe, niveauId } = await request.json();
    
    // Validate input
    if (!name || !sexe || !niveauId) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate sexe
    if (!['M', 'F'].includes(sexe)) {
      return NextResponse.json(
        { error: 'Invalid gender value' },
        { status: 400 }
      );
    }

    // Verify niveau exists
    const niveau = await prisma.niveau.findUnique({
      where: { id: niveauId },
    });

    if (!niveau) {
      return NextResponse.json(
        { error: 'Invalid niveau selected' },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: authResult.userId },
      data: {
        name,
        sexe,
        niveauId,
        profileCompleted: true,
      },
      include: {
        niveau: true,
      },
    });

    // Remove sensitive data
    const { password, verificationToken, passwordResetToken, ...userWithoutSensitiveData } = updatedUser;

    return NextResponse.json({
      user: userWithoutSensitiveData,
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 