import {
	pgTable,
	text,
	timestamp,
	uuid,
	bigserial,
	pgEnum,
	jsonb,
	index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

export const videoStatus = pgEnum('video_status', ['todo', 'doing', 'done']);

export const videoSessions = pgTable(
	'video_sessions',
	{
		id: uuid('id').notNull().primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		url: text('url').notNull(),
		thumbnailUrl: text('thumbnail_url'),
		status: videoStatus('status').default('todo').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('video_sessions_user_id_status_idx').on(table.userId, table.status)]
);

export const videoMarkdown = pgTable('video_markdown', {
	id: bigserial('id', { mode: 'number' }).notNull().primaryKey(),
	videoId: uuid('video_id')
		.notNull()
		.unique()
		.references(() => videoSessions.id, { onDelete: 'cascade' }),
	content: jsonb('content'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const videoSessionsRelations = relations(videoSessions, ({ one }) => ({
	user: one(user, {
		fields: [videoSessions.userId],
		references: [user.id]
	}),
	markdown: one(videoMarkdown)
}));

export const videoMarkdownRelations = relations(videoMarkdown, ({ one }) => ({
	videoSession: one(videoSessions, {
		fields: [videoMarkdown.videoId],
		references: [videoSessions.id]
	})
}));

export type VideoSession = typeof videoSessions.$inferSelect;
export type VideoMarkdown = typeof videoMarkdown.$inferSelect;
