import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple sanitization: accept data:image/*, http(s) URLs, or root-relative; max 6
function sanitizeImages(list: unknown): string[] {
	if (!Array.isArray(list)) return [];
	return (list as any[])
		.filter(u => typeof u === 'string')
		.map(u => (u.startsWith('blob:') ? '' : u))
		.filter(Boolean)
		.filter(u => u.startsWith('data:image/') || /^https?:\/\//i.test(u) || u.startsWith('/'))
		.slice(0, 6);
}

// GET: straight prisma fetch
export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const userId = searchParams.get('userId');
	const questionId = searchParams.get('questionId');
	if (!userId || !questionId) return NextResponse.json({ error: 'userId and questionId are required' }, { status: 400 });
		try {
			const row: any = await prisma.questionUserData.findUnique({
				where: { userId_questionId: { userId, questionId } },
				// select without notesImageUrls then fetch via raw to avoid prisma type mismatch if schema not migrated
				select: { userId: true, questionId: true, notes: true, highlights: true, attempts: true, lastScore: true }
			});
			if (!row) return NextResponse.json(null);
			// Raw fetch images
			let images: string[] = [];
			try {
				const rs: any[] = await prisma.$queryRaw`SELECT notes_image_urls FROM question_user_data WHERE user_id = ${userId}::uuid AND question_id = ${questionId}::uuid LIMIT 1`;
				if (rs[0]?.notes_image_urls) images = sanitizeImages(rs[0].notes_image_urls as any[]);
				console.log(`[GET] User ${userId} Question ${questionId} - Found ${images.length} images in DB`);
			} catch (e) {
				console.log(`[GET] User ${userId} Question ${questionId} - Error fetching images:`, (e as any)?.message);
			}
			return NextResponse.json({ ...row, notesImageUrls: images });
	} catch (e) {
		console.error('GET user-question-state error', (e as any)?.message);
		return NextResponse.json(null);
	}
}

// POST: simple upsert
export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const { userId, questionId, notes, highlights, attempts, lastScore, incrementAttempts, notesImageUrls } = body || {};
	if (!userId || !questionId) return NextResponse.json({ error: 'userId and questionId are required' }, { status: 400 });
	const sanitized = sanitizeImages(notesImageUrls);
	console.log(`[POST] User ${userId} Question ${questionId} - Incoming ${Array.isArray(notesImageUrls) ? notesImageUrls.length : 'n/a'} images, sanitized to ${sanitized.length}`);
	let nextAttempts = attempts ?? 0;
	if (incrementAttempts) {
		try {
			const existing = await prisma.questionUserData.findUnique({ where: { userId_questionId: { userId, questionId } }, select: { attempts: true } });
			nextAttempts = (existing?.attempts ?? 0) + 1;
		} catch {
			nextAttempts = (attempts ?? 0) + 1;
		}
	}
		try {
			// Upsert without images first (schema type mismatch guard)
			const base = await prisma.questionUserData.upsert({
				where: { userId_questionId: { userId, questionId } },
				create: { userId, questionId, notes: notes ?? null, highlights: highlights ?? null, attempts: nextAttempts, lastScore: lastScore ?? null },
				update: { notes, highlights, attempts: nextAttempts, lastScore },
				select: { userId: true, questionId: true, notes: true, highlights: true, attempts: true, lastScore: true }
			});
			// Persist images via raw
			try {
				await prisma.$executeRaw`UPDATE question_user_data SET notes_image_urls = ${sanitized} WHERE user_id = ${userId}::uuid AND question_id = ${questionId}::uuid`;
				console.log(`[POST] User ${userId} Question ${questionId} - Successfully updated ${sanitized.length} images`);
			} catch (e) {
				console.log(`[POST] User ${userId} Question ${questionId} - Update failed, trying column create:`, (e as any)?.message);
				// attempt column create then retry
				try {
					await prisma.$executeRawUnsafe('ALTER TABLE question_user_data ADD COLUMN IF NOT EXISTS notes_image_urls text[] NOT NULL DEFAULT \'{}\'');
					await prisma.$executeRaw`UPDATE question_user_data SET notes_image_urls = ${sanitized} WHERE user_id = ${userId}::uuid AND question_id = ${questionId}::uuid`;
					console.log(`[POST] User ${userId} Question ${questionId} - Successfully updated ${sanitized.length} images after column create`);
				} catch (e2) {
					console.log(`[POST] User ${userId} Question ${questionId} - Final update failed:`, (e2 as any)?.message);
				}
			}
			let images: string[] = sanitized;
			try {
				const rs: any[] = await prisma.$queryRaw`SELECT notes_image_urls FROM question_user_data WHERE user_id = ${userId}::uuid AND question_id = ${questionId}::uuid LIMIT 1`;
				if (rs[0]?.notes_image_urls) images = sanitizeImages(rs[0].notes_image_urls as any[]);
				console.log(`[POST] User ${userId} Question ${questionId} - Verification: DB now has ${images.length} images`);
			} catch (e) {
				console.log(`[POST] User ${userId} Question ${questionId} - Verification failed:`, (e as any)?.message);
			}
			return NextResponse.json({ ...base, notesImageUrls: images });
	} catch (e) {
		console.error('POST user-question-state error', (e as any)?.message);
		return NextResponse.json({ userId, questionId, notes: notes ?? null, highlights: highlights ?? null, attempts: nextAttempts, lastScore: lastScore ?? null, notesImageUrls: sanitized });
	}
}
