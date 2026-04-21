// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Window {
		onYouTubeIframeAPIReady: () => void;
		YT: typeof YT;
	}
	namespace App {
		// interface Error {}
		interface Locals {
			session: {
				id: string;
				createdAt: Date;
				updatedAt: Date;
				userId: string;
				expiresAt: Date;
				token: string;
				ipAddress?: string | null | undefined | undefined;
				userAgent?: string | null | undefined | undefined;
			} | null;
			user: {
				id: string;
				createdAt: Date;
				updatedAt: Date;
				email: string;
				emailVerified: boolean;
				name: string;
				image?: string | null | undefined | undefined;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
