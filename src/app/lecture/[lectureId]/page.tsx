import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import ClientLecturePage from './ClientLecturePage';

// Loosen prop typing to satisfy Next.js generated PageProps inference
export default function LecturePage(props: any) {
	const lectureId = props?.params?.lectureId as string | undefined;
	if (!lectureId) return notFound();
	return (
		<Suspense fallback={<div className="p-6">Chargement...</div>}>
			<ClientLecturePage lectureId={lectureId} />
		</Suspense>
	);
}

