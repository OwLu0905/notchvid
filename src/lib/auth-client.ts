import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient();

export const signIn = async () => {
	return await authClient.signIn.social({
		provider: 'google'
	});
};
