import {
	pgTable,
	text,
	timestamp,
	uuid,
	bigserial,
	bigint,
	integer,
	real,
	pgEnum,
	jsonb
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './database/schema/auth';
import { chatSessions } from './chat';

export const markdownTypeEnum = pgEnum('markdown_type', ['draft', 'summary']);

export const echoSessions = pgTable('echo_sessions', {
	id: uuid('id').notNull().primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	url: text('url').notNull(),
	thumbnailUrl: text('thumbnail_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const audioGroups = pgTable('audio_groups', {
	id: bigserial('id', { mode: 'number' }).notNull().primaryKey(),
	echoId: uuid('echo_id')
		.notNull()
		.references(() => echoSessions.id, { onDelete: 'cascade' }),
	text: text('text'),
	start: real('start_seconds').default(0).notNull(),
	end: real('end_seconds').default(0).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const audios = pgTable('audios', {
	id: bigserial('id', { mode: 'number' }).notNull().primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	echoId: uuid('echo_id')
		.notNull()
		.references(() => echoSessions.id, { onDelete: 'cascade' }),
	groupId: bigint('group_id', { mode: 'number' })
		.notNull()
		.references(() => audioGroups.id, { onDelete: 'cascade' }),
	audioUrl: text('audio_url').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const echoMarkdown = pgTable('echo_markdown', {
	id: bigserial('id', { mode: 'number' }).notNull().primaryKey(),
	echoId: uuid('echo_id')
		.notNull()
		.references(() => echoSessions.id, { onDelete: 'cascade' }),
	type: markdownTypeEnum('type').notNull(),
	content: jsonb('content'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const usersRelations = relations(user, ({ many }) => ({
	chatSessions: many(chatSessions),
	echoSessions: many(echoSessions)
}));

export const echoSessionsRelations = relations(echoSessions, ({ one, many }) => ({
	user: one(user, {
		fields: [echoSessions.userId],
		references: [user.id]
	}),
	audioGroups: many(audioGroups),
	audios: many(audios),
	markdown: many(echoMarkdown)
}));

export const audioGroupsRelations = relations(audioGroups, ({ one, many }) => ({
	echoSession: one(echoSessions, {
		fields: [audioGroups.echoId],
		references: [echoSessions.id]
	}),
	audios: many(audios)
}));

export const audiosRelations = relations(audios, ({ one }) => ({
	echoSession: one(echoSessions, {
		fields: [audios.echoId],
		references: [echoSessions.id]
	}),
	audioGroup: one(audioGroups, {
		fields: [audios.groupId],
		references: [audioGroups.id]
	}),
	user: one(user, {
		fields: [audios.userId],
		references: [user.id]
	})
}));

export const echoMarkdownRelations = relations(echoMarkdown, ({ one }) => ({
	echoSession: one(echoSessions, {
		fields: [echoMarkdown.echoId],
		references: [echoSessions.id]
	})
}));

export type EchoSession = typeof echoSessions.$inferSelect;

export type AudioGroup = typeof audioGroups.$inferSelect;

export type Audio = typeof audios.$inferSelect;

export type EchoMarkdown = typeof echoMarkdown.$inferSelect;
