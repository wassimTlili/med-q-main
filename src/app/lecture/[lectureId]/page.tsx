import React from 'react';
import { notFound } from 'next/navigation';
import ClientLecturePage from './ClientLecturePage';

// Use a very permissive prop type to bypass mismatched PageProps inference in build output
export default async function LecturePage(props: any) {
	// Support params being either an object or a Promise (defensive for internal type expectations)
	const rawParams = props?.params ? await props.params : {};
	const lectureId = rawParams?.lectureId;
	if (!lectureId || typeof lectureId !== 'string') notFound();
	return <ClientLecturePage lectureId={lectureId} />;
}
