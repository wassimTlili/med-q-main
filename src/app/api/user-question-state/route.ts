import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/user-question-state?userId=&questionId=
export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const userId = searchParams.get('userId') as string | null;
		const questionId = searchParams.get('questionId') as string | null;
		if (!userId || !questionId) {
			return NextResponse.json({ error: 'userId and questionId are required' }, { status: 400 });
		}
			// @ts-ignore - model exists after migration/generate
			const data = await prisma.questionUserData.findUnique({
				where: { userId_questionId: { userId, questionId } },
			});
		return NextResponse.json(data ?? null);
	} catch (e) {
		console.error('GET user-question-state error', e);
		return NextResponse.json({ error: 'Internal error' }, { status: 500 });
	}
}

// POST /api/user-question-state { userId, questionId, notes?, highlights?, attempts?, lastScore? }
export async function POST(req: Request) {
	try {
		const body = await req.json();
			const { userId, questionId, notes, highlights, attempts, lastScore, incrementAttempts } = body || {};
		if (!userId || !questionId) {
			return NextResponse.json({ error: 'userId and questionId are required' }, { status: 400 });
		}
			let nextAttempts = attempts;
			if (incrementAttempts) {
				// @ts-ignore - model exists after migration/generate
				const existing = await prisma.questionUserData.findUnique({ where: { userId_questionId: { userId, questionId } } });
				nextAttempts = (existing?.attempts ?? 0) + 1;
			}
			// @ts-ignore - model exists after migration/generate
			const updated = await prisma.questionUserData.upsert({
				where: { userId_questionId: { userId, questionId } },
				create: { userId, questionId, notes: notes ?? null, highlights: highlights ?? null, attempts: nextAttempts ?? 0, lastScore: lastScore ?? null },
				update: { notes, highlights, attempts: nextAttempts ?? attempts, lastScore },
			});
		return NextResponse.json(updated);
	} catch (e) {
		console.error('POST user-question-state error', e);
		return NextResponse.json({ error: 'Internal error' }, { status: 500 });
	}
}
