<script lang="ts" module>
	// sample data
	const data = {
		navMain: [
			{
				title: 'Getting Started',
				url: '#',
				items: [
					{
						title: 'Installation',
						url: '#'
					},
					{
						title: 'Project Structure',
						url: '#'
					}
				]
			},
			{
				title: 'Build Your Application',
				url: '#',
				items: [
					{
						title: 'Routing',
						url: '1'
					},
					{
						title: 'Data Fetching',
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
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import type { ComponentProps } from 'svelte';

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

	const sidebar = useSidebar();
	let url = $derived(page.url);
	let pathname = $derived(url.pathname);

	const session = authClient.useSession();
	const user = $derived($session.data?.user);
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
								<span class="font-medium">Documentation</span>
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
			<Sidebar.Menu class="gap-2">
				{#each data.navMain as item (item.title)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props })}
								<a href={item.url} class="font-medium" {...props}>
									{item.title}
								</a>
							{/snippet}
						</Sidebar.MenuButton>
						{#if item.items?.length}
							<Sidebar.MenuSub class="ms-0 border-s-0 px-1.5">
								{#each item.items as subItem (subItem.title)}
									<Sidebar.MenuSubItem>
										<Sidebar.MenuSubButton isActive={pathname === `/video/${subItem.url}`}>
											{#snippet child({ props })}
												<a href={`/video/${subItem.url}`} {...props}>{subItem.title}</a>
											{/snippet}
										</Sidebar.MenuSubButton>
									</Sidebar.MenuSubItem>
								{/each}
							</Sidebar.MenuSub>
						{/if}
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
								<!-- <Avatar.Root class="size-8 rounded-lg">
									<Avatar.Image src={user?.image} alt={user?.name} />
									<Avatar.Fallback class="rounded-lg">CN</Avatar.Fallback>
								</Avatar.Root> -->
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
