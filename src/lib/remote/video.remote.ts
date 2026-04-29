import { command, getRequestEvent, query } from '$app/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import * as z from 'zod';

import {
	videoMarkdown,
	videoSessions,
	type VideoMarkdown,
	type VideoSession
} from '$lib/server/database/schema/video';
import { DEFAULT_DONE_LIMIT } from '$lib/utils';

const createVideoInput = z.object({
	title: z.string().min(1),
	url: z.string(),
	thumbnailUrl: z.string().url().optional()
});

const prosemirrorDoc = z
	.object({
		type: z.literal('doc'),
		content: z.array(z.any()).optional()
	})
	.nullable();

const updateMarkdownInput = z.object({
	videoId: z.uuid(),
	content: prosemirrorDoc
});

const videoIdInput = z.uuid();

const doneListInput = z.object({
	limit: z.number().int().positive().max(200)
});

const getSession = query(() => {
	const event = getRequestEvent();
	return event.locals.auth.api.getSession({ headers: event.request.headers });
});

async function requireAuth() {
	const user = (await getSession())?.user;
	if (!user) throw redirect(307, '/login');
	return user;
}

async function requireOwnedSession(videoId: string, userId: string) {
	const { db } = getRequestEvent().locals;
	const rows = await db
		.select({ id: videoSessions.id })
		.from(videoSessions)
		.where(and(eq(videoSessions.id, videoId), eq(videoSessions.userId, userId)))
		.limit(1);

	if (!rows[0]) throw new Error('Video not found or unauthorized');
	return rows[0];
}

export const createVideoSession = command(createVideoInput, async (data) => {
	const user = await requireAuth();
	const { db } = getRequestEvent().locals;

	const [session] = await db
		.insert(videoSessions)
		.values({
			userId: user.id,
			title: data.title,
			url: data.url,
			thumbnailUrl: data.thumbnailUrl ?? null
		})
		.returning();

	await db.insert(videoMarkdown).values({ videoId: session.id, content: null });
	await getActiveSessions().refresh();

	return session.id;
});

export const getActiveSessions = query(async () => {
	const user = await requireAuth();
	const { db } = getRequestEvent().locals;

	return db
		.select()
		.from(videoSessions)
		.where(and(eq(videoSessions.userId, user.id), inArray(videoSessions.status, ['todo', 'doing'])))
		.orderBy(desc(videoSessions.updatedAt));
});

export type DonePage = {
	items: VideoSession[];
	hasMore: boolean;
};

export const getDoneSessions = query(doneListInput, async ({ limit }): Promise<DonePage> => {
	const user = await requireAuth();
	const { db } = getRequestEvent().locals;

	const rows = await db
		.select()
		.from(videoSessions)
		.where(and(eq(videoSessions.userId, user.id), eq(videoSessions.status, 'done')))
		.orderBy(desc(videoSessions.updatedAt))
		.limit(limit + 1);

	const hasMore = rows.length > limit;
	return { items: hasMore ? rows.slice(0, limit) : rows, hasMore };
});

export type VideoWithMarkdown = {
	video: VideoSession;
	markdown: VideoMarkdown | null;
};

export const getVideoWithMarkdown = query(
	videoIdInput,
	async (videoId): Promise<VideoWithMarkdown> => {
		const user = await requireAuth();
		const { db } = getRequestEvent().locals;

		const rows = await db
			.select()
			.from(videoSessions)
			.leftJoin(videoMarkdown, eq(videoMarkdown.videoId, videoSessions.id))
			.where(and(eq(videoSessions.id, videoId), eq(videoSessions.userId, user.id)))
			.limit(1);

		const row = rows[0];
		if (!row) throw redirect(308, '/video');

		return { video: row.video_sessions, markdown: row.video_markdown };
	}
);

export const updateVideoMarkdown = command(updateMarkdownInput, async ({ videoId, content }) => {
	const user = await requireAuth();
	await requireOwnedSession(videoId, user.id);
	const { db } = getRequestEvent().locals;

	const [updated] = await db
		.update(videoMarkdown)
		.set({ content })
		.where(eq(videoMarkdown.videoId, videoId))
		.returning();

	if (!updated) {
		const [inserted] = await db.insert(videoMarkdown).values({ videoId, content }).returning();
		return inserted;
	}

	return updated;
});

export const deleteVideoSession = command(videoIdInput, async (videoId) => {
	const user = await requireAuth();
	await requireOwnedSession(videoId, user.id);
	const { db } = getRequestEvent().locals;

	await db.delete(videoSessions).where(eq(videoSessions.id, videoId));

	await Promise.all([
		getActiveSessions().refresh(),
		getDoneSessions({ limit: DEFAULT_DONE_LIMIT }).refresh()
	]);

	return { videoId };
});

export const markVideoDoing = command(videoIdInput, async (videoId) => {
	const user = await requireAuth();
	await requireOwnedSession(videoId, user.id);
	const { db } = getRequestEvent().locals;

	const [updated] = await db
		.update(videoSessions)
		.set({ status: 'doing' })
		.where(and(eq(videoSessions.id, videoId), eq(videoSessions.status, 'todo')))
		.returning();

	await getActiveSessions().refresh();

	return updated;
});

export const markVideoDone = command(videoIdInput, async (videoId) => {
	const user = await requireAuth();
	await requireOwnedSession(videoId, user.id);
	const { db } = getRequestEvent().locals;

	const [updated] = await db
		.update(videoSessions)
		.set({ status: 'done' })
		.where(and(eq(videoSessions.id, videoId), eq(videoSessions.status, 'doing')))
		.returning();

	await Promise.all([
		getActiveSessions().refresh(),
		getDoneSessions({ limit: DEFAULT_DONE_LIMIT }).refresh()
	]);

	return updated;
});
