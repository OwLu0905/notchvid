<script lang="ts">
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { toggleMode, mode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';

	interface Props {
		variant: 'button' | 'switch';
	}
	let { variant }: Props = $props();

	let isDark = $state(mode.current === 'dark');
</script>

<div class="ms-auto">
	{#if variant === 'button'}
		<Button onclick={toggleMode} variant="outline" size="icon">
			<SunIcon
				class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
			/>
			<MoonIcon
				class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
			/>
			<span class="sr-only">Toggle theme</span>
		</Button>
	{:else}
		<div class="flex items-center space-x-2">
			<Switch
				id="mode"
				bind:checked={isDark}
				onCheckedChange={() => {
					toggleMode();
				}}
			/>
		</div>
	{/if}
</div>
