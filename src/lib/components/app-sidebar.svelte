<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { PlusIcon, SunMoonIcon } from '@lucide/svelte';
	import type { ComponentProps } from 'svelte';
	import { deleteVideoSession, getActiveSessions, getDoneSessions } from '$lib/remote/video.remote';

	import type { VideoSession } from '$lib/server/database/schema/video';
	import ModeButton from './mode-button.svelte';
	import { DEFAULT_DONE_LIMIT } from '$lib/utils';

	const DONE_PAGE_INCREMENT = 10;

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

	const sidebar = useSidebar();
	let url = $derived(page.url);
	let pathname = $derived(url.pathname);

	const session = authClient.useSession();
	const user = $derived($session.data?.user);

	let active = $derived(await getActiveSessions());
	let doing = $derived(active.filter((v) => v.status === 'doing'));
	let todo = $derived(active.filter((v) => v.status === 'todo'));

	let doneLimit = $state(DEFAULT_DONE_LIMIT);
	let donePage = $derived(await getDoneSessions({ limit: doneLimit }));

	let todoOpen = $state(true);
	let doneOpen = $state(false);
	let loadingMoreDone = $state(false);

	async function loadMoreDone() {
		if (loadingMoreDone) return;
		loadingMoreDone = true;
		const nextLimit = doneLimit + DONE_PAGE_INCREMENT;
		try {
			await getDoneSessions({ limit: nextLimit });
			doneLimit = nextLimit;
		} finally {
			loadingMoreDone = false;
		}
	}

	let deleteTarget = $state<{ id: string; title: string } | null>(null);
	let isDeleting = $state(false);

	async function confirmDelete() {
		if (!deleteTarget) return;
		const deletedId = deleteTarget.id;
		isDeleting = true;
		try {
			await deleteVideoSession(deletedId);
			if (doneLimit !== DEFAULT_DONE_LIMIT) {
				await getDoneSessions({ limit: doneLimit }).refresh();
			}
			try {
				localStorage.removeItem(`notchvid:editor:${deletedId}`);
				localStorage.removeItem(`notchvid:editor:decided:${deletedId}`);
			} catch {
				// storage may be disabled
			}
			deleteTarget = null;
			if (pathname === `/video/${deletedId}`) {
				await goto('/video');
			}
		} finally {
			isDeleting = false;
		}
	}
</script>

{#snippet videoRow(item: VideoSession)}
	<Sidebar.MenuItem>
		<Sidebar.MenuButton isActive={pathname === `/video/${item.id}`}>
			{#snippet child({ props })}
				<a href={`/video/${item.id}`} {...props}>
					<span class="truncate">{item.title}</span>
				</a>
			{/snippet}
		</Sidebar.MenuButton>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuAction showOnHover {...props}>
						<EllipsisIcon />
						<span class="sr-only">More</span>
					</Sidebar.MenuAction>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align={sidebar.isMobile ? 'end' : 'start'}
			>
				<DropdownMenu.Item onSelect={() => (deleteTarget = { id: item.id, title: item.title })}>
					<Trash2Icon class="text-muted-foreground" />
					<span>Delete</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
{/snippet}

<Sidebar.Root bind:ref variant="floating" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#snippet child({ props })}
						<a href="##" {...props}>
							<div
								class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
							>
								<GalleryVerticalEndIcon class="size-4" />
							</div>
							<div class="flex flex-col gap-0.5 leading-none">
								<span class="font-medium">Notchvid</span>
								<span class="">v1.0.0</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.Menu class="ms-0 border-s-0 px-1.5">
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={pathname === `/video`}>
						{#snippet child({ props })}
							<a href={`/video`} {...props}>
								<PlusIcon />
								<span> New Video </span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>

		<Sidebar.Group>
			<Sidebar.GroupLabel class="tabular-nums">
				Doing ({doing.length})
			</Sidebar.GroupLabel>
			<Sidebar.Menu class="ms-0 border-s-0 px-1.5">
				{#each doing as item (item.id)}
					{@render videoRow(item)}
				{/each}
				{#if doing.length === 0}
					<li class="px-2 py-1 text-xs text-muted-foreground">Nothing in progress.</li>
				{/if}
			</Sidebar.Menu>
		</Sidebar.Group>

		<Sidebar.Group>
			<button
				type="button"
				class="flex w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
				onclick={() => (todoOpen = !todoOpen)}
				aria-expanded={todoOpen}
				aria-controls="sidebar-todo-list"
			>
				<ChevronRightIcon class="size-3.5 transition-transform {todoOpen ? 'rotate-90' : ''}" />
				<span class="tabular-nums">Todo ({todo.length})</span>
			</button>
			{#if todoOpen}
				<Sidebar.Menu id="sidebar-todo-list" class="ms-0 border-s-0 px-1.5">
					{#each todo as item (item.id)}
						{@render videoRow(item)}
					{/each}
					{#if todo.length === 0}
						<li class="px-2 py-1 text-xs text-muted-foreground">Backlog is empty.</li>
					{/if}
				</Sidebar.Menu>
			{/if}
		</Sidebar.Group>

		<Sidebar.Group>
			<button
				type="button"
				class="flex w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
				onclick={() => (doneOpen = !doneOpen)}
				aria-expanded={doneOpen}
				aria-controls="sidebar-done-list"
			>
				<ChevronRightIcon class="size-3.5 transition-transform {doneOpen ? 'rotate-90' : ''}" />
				<span class="tabular-nums">Done</span>
			</button>
			{#if doneOpen}
				<Sidebar.Menu id="sidebar-done-list" class="ms-0 border-s-0 px-1.5">
					{#each donePage.items as item (item.id)}
						{@render videoRow(item)}
					{/each}
					{#if donePage.items.length === 0}
						<li class="px-2 py-1 text-xs text-muted-foreground">Nothing completed yet.</li>
					{/if}
					{#if donePage.hasMore}
						<li>
							<button
								type="button"
								disabled={loadingMoreDone}
								onclick={loadMoreDone}
								class="flex w-full items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{loadingMoreDone ? 'Loading…' : 'Show more'}
							</button>
						</li>
					{/if}
				</Sidebar.Menu>
			{/if}
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Separator />
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								{...props}
								size="lg"
								class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<div class="grid flex-1 text-start text-sm leading-tight">
									<span class="truncate font-medium">{user?.name}</span>
									<span class="truncate text-xs">{user?.email}</span>
								</div>
								<ChevronsUpDownIcon class="ms-auto size-4" />
							</Sidebar.MenuButton>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
						side={sidebar.isMobile ? 'bottom' : 'right'}
						align="start"
						sideOffset={4}
					>
						<DropdownMenu.Label class="p-0 font-normal">
							<div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
								<div class="grid flex-1 text-start text-sm leading-tight">
									<span class="truncate font-medium">{user?.name}</span>
									<span class="truncate text-xs">{user?.email}</span>
								</div>
							</div>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Group>
							<DropdownMenu.Item closeOnSelect={false}>
								<SunMoonIcon />
								Dark mode
								<ModeButton variant="switch" />
							</DropdownMenu.Item>
						</DropdownMenu.Group>
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							onclick={() => {
								authClient.signOut({
									fetchOptions: {
										onSuccess: () => {
											goto('/login');
										}
									}
								});
							}}
						>
							<LogOutIcon />
							Log out
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>

<AlertDialog.Root
	open={deleteTarget !== null}
	onOpenChange={(open) => {
		if (!open) deleteTarget = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete this video?</AlertDialog.Title>
			<AlertDialog.Description>
				This will permanently delete <span class="font-medium">{deleteTarget?.title}</span> and all of
				its notes. This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isDeleting}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" disabled={isDeleting} onclick={confirmDelete}>
				{isDeleting ? 'Deleting...' : 'Delete'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
