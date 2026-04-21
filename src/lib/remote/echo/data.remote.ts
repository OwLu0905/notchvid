import { command, form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/server/database';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import * as z from 'zod';
import {
	createAudioGroupSchema,
	createAudioSchema,
	createEchoSchema,
	deleteAudioGroupSchema,
	deleteAudioSchema,
	updateAudioGroupIntervalSchema,
	updateAudioGroupTextSchema
} from './valid-schema';
import { redirect } from '@sveltejs/kit';

import { auth } from '$lib/server/auth';
import { s3Manager } from '@/server/s3-manager';
import { audioGroups, audios, echoSessions, type EchoSession } from '@/server/database/schema/echo';

function format(time: Date): `${string}-${string}` {
	const year = time.getFullYear();
	const month = String(time.getMonth() + 1).padStart(2, '0');

	return `${year}-${month}`;
}

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

export const createEchoSession = form(createEchoSchema, async (data) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	let id: string | undefined;

	const rawResult = await db
		.insert(echoSessions)
		.values({ ...data, userId: user.id })
		.returning({ sessionId: echoSessions.id });

	id = rawResult[0].sessionId;

	if (id) {
		redirect(303, `/echo/list/${id}`);
	}
});

export const getEchoSessions = query(async () => {
	const user = await requireAuth();

	if (!user) throw new Error('invalid user');

	try {
		const result = await db
			.select()
			.from(echoSessions)
			.where(eq(echoSessions.userId, user.id))
			.orderBy(desc(echoSessions.createdAt));

		const groupByMonth = result.reduce(
			(acc, current) => {
				const data = { ...current };
				const timeGroup = format(current.createdAt);

				const findIndex = acc.findIndex((i) => i.time === timeGroup);
				if (findIndex === -1) {
					acc.push({
						time: timeGroup,
						data: [data]
					});
				} else {
					acc[findIndex].data.push(data);
				}

				return acc;
			},
			[] as { time: `${string}-${string}`; data: EchoSession[] }[]
		);

		return groupByMonth;
	} catch (error) {
		return [];
	}
});

export const getEchoSessionData = query(z.string(), async (sessionId) => {
	const user = await requireAuth();

	try {
		if (!user) throw new Error('invalid user');

		const result = await db
			.select()
			.from(echoSessions)
			.leftJoin(audios, eq(audios.echoId, echoSessions.id))
			.where(and(eq(echoSessions.id, sessionId), eq(echoSessions.userId, user.id)));

		const session = result[0]?.echo_sessions;
		if (!session) {
			redirect(308, '/echo');
		}

		// Fetch audio groups for this session
		const groups = await db
			.select()
			.from(audioGroups)
			.where(eq(audioGroups.echoId, sessionId))
			.orderBy(desc(audioGroups.createdAt));

		const audioCheck = result?.[0]?.audios;
		if (audioCheck === null) {
			return { echo: result[0].echo_sessions, audios: [], audioGroups: groups };
		}

		const audioList = result.map((i) => i.audios).filter((audio) => audio !== null);

		const data = await Promise.all(
			audioList.map(async (i) => {
				try {
					const signedUrl = await s3Manager.getSignedUrl(i.audioUrl);
					return { ...i, audioUrl: signedUrl };
				} catch (err) {
					console.error(`Failed to generate signed URL for ${i.audioUrl}:`, err);
					throw new Error('Failed to load audio');
				}
			})
		);

		return { echo: result[0].echo_sessions, audios: data, audioGroups: groups };
	} catch (err) {
		redirect(308, '/echo');
	}
});

export const createAudio = form(createAudioSchema, async (data) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	const sessionId = data.echoId;

	const generateKey = (filename: string) => `audios/${user.id}/${sessionId}/${filename}`;
	const filename = crypto.randomUUID();

	const keyId = generateKey(filename);

	const audioFile = data.audioFile;
	const fileType = audioFile.type;
	const arrayBuffer = await audioFile.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	await s3Manager.upload(keyId, buffer, fileType);
	const newAudio = await db.insert(audios).values({
		userId: user.id,
		echoId: sessionId,
		groupId: data.groupId,
		audioUrl: keyId
	});

	// NOTE: current workaround
	// const audioValue = newAudio[0];
	// const signedUrl = await s3Manager.getSignedUrl(audioValue.audioUrl);
	// getEchoSessionData(sessionId).withOverride((data) => {
	// 	return { echo: data.echo, audios: [{ ...audioValue, audioUrl: signedUrl }, ...data.audios] };
	// });

	const result = await getEchoSessionData(sessionId);
	return result;
});

export const deleteAudio = command(deleteAudioSchema, async (data) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	const deleteItem = await db
		.delete(audios)
		.where(and(eq(audios.id, data.audioId), eq(audios.echoId, data.echoId), eq(audios.userId, user.id)))
		.returning();

	const item = deleteItem[0];
	if (!item) {
		throw new Error('Audio not found or unauthorized');
	}

	// s3
	await s3Manager.delete(item.audioUrl);

	const result = await getEchoSessionData(data.echoId);
	return result;
});

export const createAudioGroup = command(createAudioGroupSchema, async (data) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	const result = await db
		.insert(audioGroups)
		.values({
			echoId: data.echoId,
			text: data.text,
			start: data.start,
			end: data.end
		})
		.returning();

	// TODO: workaround
	const res = await getEchoSessionData(data.echoId);
	return [result[0], res] as const;
});

export const getAudioGroups = query(z.string(), async (echoId) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	return await db
		.select()
		.from(audioGroups)
		.where(eq(audioGroups.echoId, echoId))
		.orderBy(desc(audioGroups.createdAt));
});

export const updateAudioGroupText = command(updateAudioGroupTextSchema, async (data) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	// Verify ownership by checking echoSession belongs to user
	const session = await db
		.select({ id: echoSessions.id })
		.from(echoSessions)
		.where(and(eq(echoSessions.id, data.echoId), eq(echoSessions.userId, user.id)))
		.limit(1);

	if (!session[0]) {
		throw new Error('Session not found or unauthorized');
	}

	await db
		.update(audioGroups)
		.set({ text: data.text })
		.where(and(eq(audioGroups.id, data.groupId), eq(audioGroups.echoId, data.echoId)));

	// TODO: workaround
	const res = await getEchoSessionData(data.echoId);
	return res;
});

//
export const updateAudioGroupInterval = command(updateAudioGroupIntervalSchema, async (data) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	// Verify ownership by checking echoSession belongs to user
	const session = await db
		.select({ id: echoSessions.id })
		.from(echoSessions)
		.where(and(eq(echoSessions.id, data.echoId), eq(echoSessions.userId, user.id)))
		.limit(1);

	if (!session[0]) {
		throw new Error('Session not found or unauthorized');
	}

	await db
		.update(audioGroups)
		.set({ start: data.start, end: data.end })
		.where(and(eq(audioGroups.id, data.groupId), eq(audioGroups.echoId, data.echoId)));

	// TODO: workaround
	const res = await getEchoSessionData(data.echoId);
	return res;
});

export const deleteAudioGroup = command(deleteAudioGroupSchema, async (data) => {
	const user = await requireAuth();
	if (!user) throw new Error('invalid user');

	// Verify ownership by checking echoSession belongs to user
	const session = await db
		.select({ id: echoSessions.id })
		.from(echoSessions)
		.where(and(eq(echoSessions.id, data.echoId), eq(echoSessions.userId, user.id)))
		.limit(1);

	if (!session[0]) {
		throw new Error('Session not found or unauthorized');
	}

	await db
		.delete(audioGroups)
		.where(and(eq(audioGroups.id, data.groupId), eq(audioGroups.echoId, data.echoId)));

	// TODO: workaround
	const res = await getEchoSessionData(data.echoId);
	return res;
});

//

export const deleteEchoSession = command(z.string(), async (sessionId) => {
	const user = await requireAuth();

	if (!user) throw new Error('invalid user');

	// Verify ownership
	const session = await db
		.select({ id: echoSessions.id })
		.from(echoSessions)
		.where(and(eq(echoSessions.id, sessionId), eq(echoSessions.userId, user.id)))
		.limit(1);

	if (!session[0]) {
		throw new Error('Session not found or unauthorized');
	}

	const audioList = await db
		.select()
		.from(audios)
		.where(and(eq(audios.userId, user.id), eq(audios.echoId, sessionId)));

	// Delete S3 files first, collect any errors but continue
	const s3Errors: Error[] = [];
	await Promise.all(
		audioList.map(async (audio) => {
			try {
				await s3Manager.delete(audio.audioUrl);
			} catch (err) {
				s3Errors.push(err instanceof Error ? err : new Error(String(err)));
			}
		})
	);

	// Delete from database even if some S3 deletions failed
	await db.delete(echoSessions).where(eq(echoSessions.id, sessionId));

	await getEchoSessions().refresh();

	// Log S3 errors if any occurred (files are orphaned but session is deleted)
	if (s3Errors.length > 0) {
		console.error(`Failed to delete ${s3Errors.length} S3 files for session ${sessionId}:`, s3Errors);
	}

	return { sessionId: sessionId };
});
