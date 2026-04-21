<script lang="ts">
	import type { ProseView } from './prose-view.svelte';
	import { slashCommandPlugin } from './plugin/slash-command-plugin';
	import * as Command from '$lib/components/ui/command/index.js';
	import { blur } from 'svelte/transition';

	function parseMMSSToSeconds(timeString: string): number {
		const [minutes, seconds] = timeString.split(':').map(Number);
		return minutes * 60 + seconds;
	}

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
		// Set initial position (will be adjusted after render)
		menuPosition = coords;
		menuVisible = true;

		// Wait for next frame to measure and adjust position
		requestAnimationFrame(() => {
			if (!menuElement) return;

			const menuWidth = menuElement.offsetWidth;
			const menuHeight = menuElement.offsetHeight;
			const padding = 8;

			// Ensure menu stays within horizontal viewport bounds
			let adjustedLeft = coords.left;
			const maxLeft = window.innerWidth - menuWidth - padding;
			const minLeft = padding;

			if (adjustedLeft > maxLeft) {
				adjustedLeft = maxLeft;
			} else if (adjustedLeft < minLeft) {
				adjustedLeft = minLeft;
			}

			// Ensure menu stays within vertical viewport bounds
			let adjustedTop = coords.top;
			const maxTop = window.innerHeight - menuHeight - padding;
			const minTop = padding;

			if (adjustedTop > maxTop) {
				adjustedTop = maxTop;
			} else if (adjustedTop < minTop) {
				adjustedTop = minTop;
			}

			menuPosition = { left: adjustedLeft, top: adjustedTop };
		});
	}

	$effect(() => {
		if (editor?.view) {
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
		}
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
						<Command.Item
							onclick={() => {
								editor.insertTimeBlock(currentTime);
							}}
						>
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
