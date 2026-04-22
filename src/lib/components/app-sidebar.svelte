<script lang="ts" module>
	// sample data
	const data = {
		navMain: [
			{
				title: 'Getting Started',
				url: '#',
				items: [
					{
						title: 'Home',
						url: '/'
					},
					{
						title: 'Video',
						url: '/video'
					}
				]
			},
			{
				title: 'Video',
				url: '#',
				items: [
					{
						title: 'video-title-1',
						url: '1'
					},
					{
						title: 'video-title-2',
						url: '2'
					}
				]
			}
		]
	};
</script>

<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	// import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import type { ComponentProps } from 'svelte';
	import { deleteVideoSession, getTodayGoal, getVideoSessions } from '$lib/remote/video.remote';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { PlusIcon } from '@lucide/svelte';

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

	const sidebar = useSidebar();
	let url = $derived(page.url);
	let pathname = $derived(url.pathname);

	const session = authClient.useSession();
	const user = $derived($session.data?.user);

	let list = $derived(await getVideoSessions());
	let todayGoal = $derived(await getTodayGoal());

	let deleteTarget = $state<{ id: string; title: string } | null>(null);
	let isDeleting = $state(false);

	async function confirmDelete() {
		if (!deleteTarget) return;
		isDeleting = true;
		try {
			await deleteVideoSession(deleteTarget.id);
			deleteTarget = null;
		} finally {
			isDeleting = false;
		}
	}
</script>

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
								<span class="font-medium">Morsel</span>
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
			<Sidebar.Menu class="gap-2">
				<Sidebar.MenuItem>
					<Sidebar.GroupLabel>Today</Sidebar.GroupLabel>
					<Sidebar.MenuSub class="ms-0 border-s-0 px-1.5">
						<Sidebar.GroupLabel class="tabular-nums"
							>Today ({todayGoal.today.length})</Sidebar.GroupLabel
						>
						{#each todayGoal.today as item (item.title)}
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton isActive={pathname === `/video/${item.id}`}>
									{#snippet child({ props })}
										<a href={`/video/${item.id}`} {...props}>
											<span>
												{item.title}
											</span>
										</a>
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
						{/each}
					</Sidebar.MenuSub>
					<Sidebar.MenuSub class="ms-0 border-s-0 px-1.5">
						<Sidebar.GroupLabel class="tabular-nums"
							>Review ({todayGoal.done.length})</Sidebar.GroupLabel
						>
						{#each todayGoal.done as item (item.title)}
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton isActive={pathname === `/video/${item.id}`}>
									{#snippet child({ props })}
										<a href={`/video/${item.id}`} {...props}>
											<span>
												{item.title}
											</span>
										</a>
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
						{/each}
					</Sidebar.MenuSub>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>

		<Sidebar.Group>
			<Sidebar.GroupLabel>Videos</Sidebar.GroupLabel>
			<Sidebar.Menu class="ms-0 border-s-0 px-1.5">
				{#each list as item (item.id)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={pathname === `/video/${item.id}`}>
							{#snippet child({ props })}
								<a href={`/video/${item.id}`} {...props}>
									<span>
										{item.title}
									</span>
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
								<DropdownMenu.Item
									onSelect={() => (deleteTarget = { id: item.id, title: item.title })}
								>
									<Trash2Icon class="text-muted-foreground" />
									<span>Delete</span>
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
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
							<DropdownMenu.Item>
								<BadgeCheckIcon />
								Account
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
