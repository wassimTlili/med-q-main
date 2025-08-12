import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/lecture-groups - Assign lecture to a group
export async function POST(request: NextRequest) {
  try {
    const { lectureId, courseGroupId } = await request.json()

    if (!lectureId || !courseGroupId) {
      return NextResponse.json({ error: 'Lecture ID and course group ID are required' }, { status: 400 })
    }

    // Remove lecture from any existing groups first
    await prisma.lectureGroup.deleteMany({
      where: {
        lectureId,
      },
    })

    // Add lecture to new group
    const lectureGroup = await prisma.lectureGroup.create({
      data: {
        lectureId,
        courseGroupId,
      },
      include: {
        lecture: true,
        courseGroup: true,
      },
    })

    return NextResponse.json(lectureGroup, { status: 201 })
  } catch (error) {
    console.error('Error assigning lecture to group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/lecture-groups - Remove lecture from group
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lectureId = searchParams.get('lectureId')

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 })
    }

    await prisma.lectureGroup.deleteMany({
      where: {
        lectureId,
      },
    })

    return NextResponse.json({ message: 'Lecture removed from group successfully' })
  } catch (error) {
    console.error('Error removing lecture from group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
