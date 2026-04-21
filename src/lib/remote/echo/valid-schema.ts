import { markdownTypeEnum } from '@/server/database/schema/echo';
import { createSelectSchema } from 'drizzle-zod';
import * as z from 'zod';

export const createEchoSchema = z.object({
	title: z.string(),
	url: z.string(),
	thumbnailUrl: z.url()
});

export const createAudioGroupSchema = z.object({
	echoId: z.uuid(),
	text: z.string().optional(),
	start: z.number(),
	end: z.number()
});

export const createAudioSchema = z.object({
	echoId: z.uuid(),
	audioFile: z.file(),
	groupId: z.number()
});

export const updateAudioGroupTextSchema = z.object({
	echoId: z.uuid(),
	groupId: z.number(),
	text: z.string()
});

export const updateAudioGroupIntervalSchema = z.object({
	echoId: z.uuid(),
	groupId: z.number(),
	start: z.number(),
	end: z.number()
});

export const deleteAudioGroupSchema = z.object({
	echoId: z.uuid(),
	groupId: z.number()
});

export const deleteAudioSchema = z.object({
	audioId: z.number(),
	echoId: z.uuid()
});
