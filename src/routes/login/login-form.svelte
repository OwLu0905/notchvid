<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		FieldGroup,
		Field,
		FieldDescription
	} from '$lib/components/ui/field/index.js';
	import Loader from '$lib/components/Loader.svelte';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import { cn } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleGoogle() {
		if (loading) return;
		loading = true;
		error = null;
		try {
			const result = await authClient.signIn.social({
				provider: 'google',
				callbackURL: '/'
			});
			if (result?.error) {
				error = result.error.message ?? 'Sign-in failed. Please try again.';
				loading = false;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Sign-in failed. Please try again.';
			loading = false;
		}
	}
</script>

<div class={cn('flex flex-col gap-6', className)} {...restProps}>
	<div class="flex flex-col gap-2 text-center sm:text-left">
		<h1 class="text-2xl font-semibold tracking-tight">Welcome back</h1>
		<p class="text-sm text-muted-foreground">
			Sign in to pick up where you left off — your notes, timestamps, and library are waiting.
		</p>
	</div>

	<FieldGroup>
		{#if error}
			<div
				role="alert"
				class="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
			>
				<AlertCircleIcon class="mt-0.5 size-4 shrink-0" />
				<span>{error}</span>
			</div>
		{/if}

		<Field>
			<Button
				variant="outline"
				type="button"
				size="lg"
				class="w-full"
				disabled={loading}
				onclick={handleGoogle}
			>
				{#if loading}
					<Loader />
					Signing in…
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						aria-hidden="true"
						class="size-4"
					>
						<path
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							fill="#4285F4"
						/>
						<path
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.997 10.997 0 0 0 12 23z"
							fill="#34A853"
						/>
						<path
							d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.997 10.997 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z"
							fill="#FBBC05"
						/>
						<path
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
							fill="#EA4335"
						/>
					</svg>
					Continue with Google
				{/if}
			</Button>
		</Field>

		<FieldDescription class="text-center">
			More sign-in options coming soon.
		</FieldDescription>
	</FieldGroup>

	<p class="text-balance text-center text-xs text-muted-foreground">
		By continuing, you agree to our
		<a href="/terms" class="font-medium underline underline-offset-4 hover:text-foreground">
			Terms of Service
		</a>
		and
		<a href="/privacy" class="font-medium underline underline-offset-4 hover:text-foreground">
			Privacy Policy
		</a>.
	</p>
</div>
