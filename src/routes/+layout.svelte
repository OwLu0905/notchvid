<script lang="ts">
	import './layout.css';
	import './prosemirror-editor.css';
	import { ModeWatcher } from 'mode-watcher';
	import favicon from '$lib/assets/favicon.svg';
	import { authClient } from '$lib/auth-client';
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import Loader from '$lib/components/Loader.svelte';
	import { getVideoSessions } from '$lib/remote/video.remote';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	let { children, data } = $props();

	function isExternal(href: string) {
		return /^https?:\/\//i.test(href);
	}

	let pendingExternal = $state<string | null>(null);
	function confirmExternal() {
		if (pendingExternal) window.open(pendingExternal, '_blank', 'noopener,noreferrer');
		pendingExternal = null;
	}

	let open = $derived(data.sidebar);
	const session = authClient.useSession();
	const user = $derived($session.data?.user);
	const isPending = $derived($session.isPending);

	type Crumb = { label: string; href?: string };

	let crumbs = $derived.by<Crumb[]>(() => {
		const pathname = page.url.pathname;
		if (pathname === '/') return [{ label: 'Home' }];

		const items: Crumb[] = [{ label: 'Home', href: '/' }];
		const videoId = page.params.id;

		if (pathname === '/video') {
			items.push({ label: 'New Video' });
		} else if (pathname.startsWith('/video/') && videoId) {
			items.push({ label: 'Video', href: '/video' });
			const current = getVideoSessions().current?.find((v) => v.id === videoId);
			let href: string | undefined;
			if (current?.url) {
				const ytURL = new URL('https://www.youtube.com/watch');
				ytURL.searchParams.set('v', current.url);
				href = ytURL.toString();
			}
			items.push({ label: current?.title ?? 'Untitled', href });
		}
		return items;
	});
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
	<link rel="icon" href={favicon} />
	<script src="https://www.youtube.com/iframe_api"></script>
</svelte:head>

<ModeWatcher />

<Sidebar.Provider style="--sidebar-width: 19rem;" class="h-svh overflow-hidden" bind:open>
	{#if !user}
		{#if isPending}
			<div class="flex w-full items-center justify-center"><Loader /></div>
		{:else}
			{@render children?.()}
		{/if}
	{:else}
		<AppSidebar />
		<Sidebar.Inset>
			<header class="flex h-16 shrink-0 items-center gap-2 px-4">
				<Sidebar.Trigger class="-ms-1" />
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						{#each crumbs as crumb, i (i)}
							<Breadcrumb.Item class={i < crumbs.length - 1 ? 'hidden md:block' : ''}>
								{#if crumb.href}
									{@const external = isExternal(crumb.href)}
									<Breadcrumb.Link
										href={crumb.href}
										class="inline-flex items-center gap-1"
										onclick={external
											? (e: MouseEvent) => {
													e.preventDefault();
													pendingExternal = crumb.href!;
												}
											: undefined}
									>
										{crumb.label}
										{#if external}
											<ExternalLinkIcon class="size-3.5" />
										{/if}
									</Breadcrumb.Link>
								{:else}
									<Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
								{/if}
							</Breadcrumb.Item>
							{#if i < crumbs.length - 1}
								<Breadcrumb.Separator class="hidden md:block" />
							{/if}
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</header>
			<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
				{@render children?.()}
			</div>
		</Sidebar.Inset>
	{/if}
</Sidebar.Provider>

<AlertDialog.Root
	open={pendingExternal !== null}
	onOpenChange={(open) => {
		if (!open) pendingExternal = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Open external link?</AlertDialog.Title>
			<AlertDialog.Description>
				This will open <span class="font-medium break-all">{pendingExternal}</span> in a new tab.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmExternal}>Continue</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
