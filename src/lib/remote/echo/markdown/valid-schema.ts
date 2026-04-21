import { markdownTypeEnum } from '@/server/database/schema/echo';
import { createSelectSchema } from 'drizzle-zod';
import * as z from 'zod';

export const markdownTypeSchema = createSelectSchema(markdownTypeEnum);

// ProseMirror document schema - validates basic structure
const prosemirrorDocSchema = z.object({
	type: z.literal('doc'),
	content: z.array(z.any()).optional() // Array of nodes
});

export const createMarkdownSchema = z.object({
	echoId: z.uuid(),
	type: markdownTypeSchema,
	content: prosemirrorDocSchema.nullable()
});
