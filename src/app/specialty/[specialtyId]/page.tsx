import React from 'react';
import ClientSpecialtyPage from './ClientSpecialtyPage';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SpecialtyPage(props: any) {
	const rawParams = props?.params ? await props.params : {};
	const id = rawParams?.specialtyId;
	if (!id || typeof id !== 'string') return notFound();
	return <ClientSpecialtyPage specialtyId={id} />;
}
