import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	// NOTE:
	if (event.url.pathname.startsWith('/login') && event.locals.user) {
		throw redirect(303, '/chat');
	}

	if (!event.url.pathname.startsWith('/login') && !event.locals.user) {
		if (!event.url.pathname.startsWith('/api')) {
			throw redirect(303, '/login');
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
