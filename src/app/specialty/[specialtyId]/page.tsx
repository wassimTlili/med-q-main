import { notFound } from 'next/navigation';
import React from 'react';

// Simple server component wrapper that delegates to the existing client specialty page under /exercices route if needed
// If the app expects /exercices/[specialtyId] as the canonical route, we can redirect or re-use logic.
// For now we just render a minimal placeholder or delegate.

export default function SpecialtyAliasPage(props: any) {
	const specialtyId = props?.params?.specialtyId as string | undefined;
	if (!specialtyId) return notFound();
	return (
		<div className="p-6">
			<h1 className="text-xl font-semibold mb-2">Spécialité</h1>
			<p className="text-sm text-muted-foreground">Veuillez utiliser la section Exercices pour consulter cette spécialité.</p>
			<p className="mt-4 text-xs text-muted-foreground">ID: {specialtyId}</p>
		</div>
	);
}
