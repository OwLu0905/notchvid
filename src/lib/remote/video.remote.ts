import { command, getRequestEvent, query } from '$app/server';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { fromZonedTime } from 'date-fns-tz';
import * as z from 'zod';

import {
	videoMarkdown,
	videoSessions,
	type VideoMarkdown,
	type VideoSession
} from '$lib/server/database/schema/video';

const tzField = z.string().min(1);

const createVideoInput = z.object({
	title: z.string().min(1),
	url: z.string(),
	thumbnailUrl: z.string().url().optional(),
	tz: tzField
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

const videoIdWithTzInput = z.object({
	videoId: z.uuid(),
	tz: tzField
});

const todayGoalInput = z.object({ tz: tzField });

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
	await getVideoSessions().refresh();
	await getTodayGoal({ tz: data.tz }).refresh();

	return session.id;
});

export const getVideoSessions = query(async () => {
	const user = await requireAuth();
	const { db } = getRequestEvent().locals;

	return db
		.select()
		.from(videoSessions)
		.where(eq(videoSessions.userId, user.id))
		.orderBy(desc(videoSessions.createdAt));
});

export type TodayGoal = {
	done: VideoSession[];
	today: VideoSession[];
};

export const getTodayGoal = query(todayGoalInput, async ({ tz }): Promise<TodayGoal> => {
	const user = await requireAuth();
	const { db } = getRequestEvent().locals;

	// Compute "today" in the client's IANA timezone, then convert the day boundary to UTC
	// so the DB query works regardless of server TZ (Cloudflare Workers run in UTC).
	const now = new Date();
	const ymd = new Intl.DateTimeFormat('en-CA', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(now); // "YYYY-MM-DD"
	const startOfDay = fromZonedTime(`${ymd}T00:00:00`, tz);
	const startOfTomorrow = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

	const [done, today] = await Promise.all([
		db
			.select()
			.from(videoSessions)
			.where(and(eq(videoSessions.userId, user.id), eq(videoSessions.status, 'done')))
			.orderBy(desc(videoSessions.updatedAt))
			.limit(3),
		db
			.select()
			.from(videoSessions)
			.where(
				and(
					eq(videoSessions.userId, user.id),
					eq(videoSessions.status, 'unfinished'),
					gte(videoSessions.createdAt, startOfDay),
					lt(videoSessions.createdAt, startOfTomorrow)
				)
			)
			.orderBy(desc(videoSessions.createdAt))
	]);

	return { done, today };
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

export const deleteVideoSession = command(videoIdWithTzInput, async ({ videoId, tz }) => {
	const user = await requireAuth();
	await requireOwnedSession(videoId, user.id);
	const { db } = getRequestEvent().locals;

	await db.delete(videoSessions).where(eq(videoSessions.id, videoId));

	await getVideoSessions().refresh();
	await getTodayGoal({ tz }).refresh();

	return { videoId };
});

export const markVideoDone = command(videoIdWithTzInput, async ({ videoId, tz }) => {
	const user = await requireAuth();
	await requireOwnedSession(videoId, user.id);
	const { db } = getRequestEvent().locals;

	const [updated] = await db
		.update(videoSessions)
		.set({ status: 'done' })
		.where(and(eq(videoSessions.id, videoId), eq(videoSessions.status, 'unfinished')))
		.returning();

	await getVideoSessions().refresh();
	await getTodayGoal({ tz }).refresh();

	return updated;
});
