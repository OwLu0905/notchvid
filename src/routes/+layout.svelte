<script lang="ts">
	import './layout.css';
	import './prosemirror-editor.css';
	import { ModeWatcher } from 'mode-watcher';
	import favicon from '$lib/assets/favicon.svg';
	import { authClient } from '$lib/auth-client';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	let { children, data } = $props();

	let open = $derived(data.sidebar);
	const session = authClient.useSession();
	const user = $derived($session.data?.user);
	const isPending = $derived($session.isPending);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script src="https://www.youtube.com/iframe_api"></script>
</svelte:head>

<ModeWatcher />

<Sidebar.Provider style="--sidebar-width: 19rem;">
	{#if !user}
		{#if isPending}
			<div class="flex w-full items-center justify-center">loading...</div>
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
						<Breadcrumb.Item class="hidden md:block">
							<Breadcrumb.Link href="##">Build Your Application</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator class="hidden md:block" />
						<Breadcrumb.Item>
							<Breadcrumb.Page>Data Fetching</Breadcrumb.Page>
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</header>
			<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
				{@render children?.()}
			</div>
		</Sidebar.Inset>
	{/if}
</Sidebar.Provider>
