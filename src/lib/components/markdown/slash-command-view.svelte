<script lang="ts">
	import { onMount } from 'svelte';
	import type { ProseView } from './prose-view.svelte';
	import { slashCommandPlugin } from './plugin/slash-command-plugin';
	import * as Command from '$lib/components/ui/command/index.js';
	import { blur } from 'svelte/transition';
	import { clampToViewport } from './utils';
	import { parseMMSSToSeconds } from '$lib/utils';

	interface Props {
		editor: ProseView;
		currentTime: number;
		playTimeBlock: (v: number) => void;
	}

	let { editor, currentTime, playTimeBlock }: Props = $props();
	let menuVisible = $state(false);
	let menuPosition = $state({ left: 0, top: 0 });
	let filteredCommands = $state<{ name: string; description: string }[]>([]);
	let menuElement: HTMLDivElement | undefined = $state();

	function adjustMenuPosition(coords: { left: number; top: number }) {
		menuPosition = coords;
		menuVisible = true;

		requestAnimationFrame(() => {
			if (!menuElement) return;
			menuPosition = clampToViewport(coords, {
				width: menuElement.offsetWidth,
				height: menuElement.offsetHeight
			});
		});
	}

	function runCommand(name: string) {
		if (name === 'time') editor.insertTimeBlock(currentTime);
	}

	onMount(() => {
		const plugin = slashCommandPlugin({
			onShowMenu(coords, commands) {
				filteredCommands = commands;
				adjustMenuPosition(coords);
			},
			onHideMenu() {
				menuVisible = false;
			},
			getTime() {
				return currentTime;
			},
			onTimeBlockClick: (time) => {
				playTimeBlock(parseMMSSToSeconds(time));
			}
		});
		editor.registerPlugin(plugin);

		return () => editor.unregisterPlugin(plugin);
	});
</script>

{#if menuVisible}
	<div
		bind:this={menuElement}
		class="slash-menu z-50"
		style="position: fixed; left: {menuPosition.left}px; top: {menuPosition.top}px;"
		tabIndex={0}
		in:blur
	>
		<Command.Root class="w-20 border border-border">
			<Command.List>
				<Command.Group heading={'helper'}>
					{#each filteredCommands as cmd}
						<Command.Item onclick={() => runCommand(cmd.name)}>
							<div class="slash-menu-item">
								<span class="name">{cmd.name}</span>
							</div>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</div>
{/if}
