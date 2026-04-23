<script lang="ts">
	import { onMount } from 'svelte';
	import type { ProseView } from './prose-view.svelte';
	import { slashCommandPlugin, type TimeBlockVariant } from './plugin/slash-command-plugin';
	import * as Command from '$lib/components/ui/command/index.js';
	import { blur } from 'svelte/transition';
	import { clampToViewport, getScrollContainer } from './utils';
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
	let selectedIndex = $state(0);
	let menuElement: HTMLDivElement | undefined = $state();

	let selectedValue = $derived(filteredCommands[selectedIndex]?.name ?? '');

	function adjustMenuPosition(coords: { left: number; cursorTop: number; cursorBottom: number }) {
		const gap = 5;
		menuPosition = { left: coords.left, top: coords.cursorBottom + gap };
		menuVisible = true;

		requestAnimationFrame(() => {
			if (!menuElement) return;
			const width = menuElement.offsetWidth;
			const height = menuElement.offsetHeight;

			const editorDom = editor.view?.dom as HTMLElement | undefined;
			const scrollContainer = getScrollContainer(editorDom ?? null);
			const bottomBoundary =
				scrollContainer?.getBoundingClientRect().bottom ?? window.innerHeight;

			let top = coords.cursorBottom + gap;
			// Flip above the cursor if placing below would overlap the footer
			if (top + height > bottomBoundary) {
				top = coords.cursorTop - gap - height;
			}

			menuPosition = clampToViewport({ left: coords.left, top }, { width, height });
		});
	}

	const TIME_BLOCK_COMMANDS: TimeBlockVariant[] = ['time', 'unclear', 'shadow'];

	function runCommand(name: string) {
		if ((TIME_BLOCK_COMMANDS as string[]).includes(name)) {
			editor.insertTimeBlock(currentTime, name as TimeBlockVariant);
		}
	}

	onMount(() => {
		const plugin = slashCommandPlugin({
			onShowMenu(coords, commands, nextSelectedIndex) {
				filteredCommands = commands;
				selectedIndex = nextSelectedIndex;
				adjustMenuPosition(coords);
			},
			onUpdateSelection(nextSelectedIndex) {
				selectedIndex = nextSelectedIndex;
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
		<Command.Root class="w-20 border border-border" value={selectedValue}>
			<Command.List>
				<Command.Group heading={'helper'}>
					{#each filteredCommands as cmd}
						<Command.Item value={cmd.name} onclick={() => runCommand(cmd.name)}>
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
