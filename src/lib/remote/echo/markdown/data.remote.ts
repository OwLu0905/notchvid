import { command, form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/server/database';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import * as z from 'zod';
import { createMarkdownSchema } from '$lib/remote/echo/markdown/valid-schema';
import { redirect } from '@sveltejs/kit';

import { auth } from '$lib/server/auth';

import {
	echoMarkdown,
	echoSessions,
	markdownTypeEnum,
	type EchoMarkdown
} from '@/server/database/schema/echo';

const getSession = query(() => {
	return auth.api.getSession({
		headers: getRequestEvent().request.headers
	});
});

async function redirectToLogin() {
	return redirect(307, '/login');
}

async function requireAuth() {
	return (await getSession())?.user;
}

export const createMarkdown = command(createMarkdownSchema, async (data) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	const result = await db.insert(echoMarkdown).values(data).returning();

	const draft = result.find((i) => i.type === 'draft');
	const summary = result.find((i) => i.type === 'summary');

	const resultMap: MarkdownMap = {
		draft: draft,
		summary: summary
	};

	// TODO: workaround
	return resultMap;

	// getMarkdown(data.echoId).refresh();
});

export type MarkdownMap = Record<
	(typeof markdownTypeEnum.enumValues)[number],
	EchoMarkdown | undefined
>;

export const getMarkdown = query(z.string(), async (echoId) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	const result = await db.select().from(echoMarkdown).where(eq(echoMarkdown.echoId, echoId));

	const draft = result.find((i) => i.type === 'draft');
	const summary = result.find((i) => i.type === 'summary');

	const resultMap: MarkdownMap = {
		draft: draft,
		summary: summary
	};
	return resultMap;
});

export const updateMarkdown = command(createMarkdownSchema, async (data) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	const { echoId, type, content } = data;

	// Verify ownership by checking echoSession belongs to user
	const session = await db
		.select({ id: echoSessions.id })
		.from(echoSessions)
		.where(and(eq(echoSessions.id, echoId), eq(echoSessions.userId, user.id)))
		.limit(1);

	if (!session[0]) {
		throw new Error('Session not found or unauthorized');
	}

	await db
		.update(echoMarkdown)
		.set({ content, updatedAt: new Date() })
		.where(and(eq(echoMarkdown.echoId, echoId), eq(echoMarkdown.type, type)));
});
