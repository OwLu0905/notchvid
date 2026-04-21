<script lang="ts">
	import { onMount, type Component, type Snippet } from 'svelte';
	import { bubbleMenuPlugin } from './plugin/bubble-menu-plugin';
	import type { ProseView } from './prose-view.svelte';
	import { type Attrs } from 'prosemirror-model';
	import { cn } from '$lib/utils';
	import { Bold, Highlighter, Strikethrough } from '@lucide/svelte';
	import { toggleVariants } from '../ui/toggle';

	interface Props {
		editor: ProseView;
		children?: Snippet;
		delayDuration?: number;
	}

	let bubbleMenuContainer: HTMLDivElement;

	let open = $state(false);

	let { editor, children, delayDuration = 500 }: Props = $props();

	onMount(() => {
		const bubblePlugin = bubbleMenuPlugin({
			element: bubbleMenuContainer,
			delayDuration,
			openState: (v) => {
				open = v;
			}
		});
		editor.registerPlugin(bubblePlugin);

		return () => {
			editor.unregisterPlugin(bubblePlugin);
		};
	});
</script>

{#snippet child(
	Content: Component,
	mark: (typeof editor.schema.marks)[string],
	attrs?: Attrs | null
)}
	<button
		class={cn(toggleVariants({ variant: 'default', size: 'sm' }))}
		data-state={editor.isActive(mark) ? 'on' : 'off'}
		onclick={() => {
			editor.onMarkBackground(mark, attrs);
		}}><Content class="size-4" /></button
	>
{/snippet}

<div bind:this={bubbleMenuContainer} style="position:fixed">
	{#if open}
		{#if children}
			{@render children()}
		{:else}
			<div
				class="bubble-menu z-50 m-1 flex h-full flex-row gap-1.5 rounded-lg bg-background px-4 py-2 ring ring-input"
			>
				{@render child(Bold, editor.schema.marks.strong)}
				{@render child(Highlighter, editor.schema.marks.highlight, {
					color: 'oklch(from var(--destructive) l c h / 0.3)'
				})}
				{@render child(Strikethrough, editor.schema.marks.strikethrough)}
			</div>
		{/if}
	{/if}
</div>
