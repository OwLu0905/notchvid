import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { redirect, type Handle } from '@sveltejs/kit';
import { createAuth, type Auth } from '$lib/server/auth';
import { createDb, type Db } from '$lib/server/database';

let cachedDb: Db | null = null;
let cachedAuth: Auth | null = null;

const REQUIRED_ENV = [
	'DATABASE_URL',
	'BETTER_AUTH_SECRET',
	'BETTER_AUTH_URL',
	'GOOGLE_CLIENT_ID',
	'GOOGLE_CLIENT_SECRET'
] as const;

function getDeps() {
	const missing = REQUIRED_ENV.filter((k) => !env[k]);
	if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);

	if (!cachedDb) cachedDb = createDb(env.DATABASE_URL);
	if (!cachedAuth) {
		cachedAuth = createAuth(cachedDb, {
			BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
			BETTER_AUTH_URL: env.BETTER_AUTH_URL,
			GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET
		});
	}
	return { db: cachedDb, auth: cachedAuth };
}

export const handle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	const { db, auth } = getDeps();
	event.locals.db = db;
	event.locals.auth = auth;

	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	if (event.url.pathname.startsWith('/login') && event.locals.user) {
		throw redirect(303, '/video');
	}

	if (!event.url.pathname.startsWith('/login') && !event.locals.user) {
		if (!event.url.pathname.startsWith('/api')) {
			throw redirect(303, '/login');
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
