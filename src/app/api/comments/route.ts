import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/comments - Get comments for a lecture
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lectureId = searchParams.get('lectureId')

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 })
    }

    // Verify lecture exists
    const lectureExists = await prisma.lecture.findUnique({
      where: { id: lectureId },
      select: { id: true }
    })

    if (!lectureExists) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    const comments = await prisma.comment.findMany({
      where: {
        lectureId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const { lectureId, userId, content } = await request.json()

    if (!lectureId || !userId || !content) {
      return NextResponse.json({ error: 'Lecture ID, user ID, and content are required' }, { status: 400 })
    }

    // Verify the lecture exists
    const lectureExists = await prisma.lecture.findUnique({
      where: { id: lectureId },
      select: { id: true }
    })

    if (!lectureExists) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    // Verify the user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        lectureId,
        userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Database error or internal server error' }, { status: 500 })
  }
}
