<script lang="ts">
	import { ProseView } from './prose-view.svelte';
	import BubbleMenuView from './bubble-menu-view.svelte';
	import { cn } from '$lib/utils';

	import SlashCommandView from './slash-command-view.svelte';
	// import {
	// 	// createMarkdown,
	// 	// updateMarkdown,
	// 	type MarkdownMap
	// } from '$lib/remote/echo/markdown/data.remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import { onDestroy } from 'svelte';

	interface Props {
		echoId: string;
		markdownMap: any;
		currentTime: number;
		playTimeBlock: (v: number) => void;
		playPause: () => void;
		playBackForth: (b: boolean) => void;
	}
	let {
		echoId,
		markdownMap = $bindable(),
		currentTime,
		playTimeBlock,
		playPause,
		playBackForth
	}: Props = $props();

	let editor: ProseView | null = $state(null);
	let editorContainer: HTMLDivElement;
	let saveTimeoutId: ReturnType<typeof setTimeout> | undefined = undefined;

	let editorLoaded = $state(false);

	const debouncedSave = (cb: () => void, delay = 300) => {
		if (saveTimeoutId) {
			clearTimeout(saveTimeoutId);
		}

		saveTimeoutId = setTimeout(() => cb(), delay);
	};
	function storeMarkdown(data: any) {
		// updateMarkdown({ echoId, content: data, type: 'draft' });
	}

	$effect(() => {
		// if (markdownMap.draft && !editorLoaded) {
		if (!editorLoaded) {
			editorLoaded = true;
			console.log('??');
			editor = new ProseView(editorContainer, markdownMap?.draft?.content ?? '', {
				onUpdate: (data) => {
					debouncedSave(() => storeMarkdown(data));
				},
				onCtrlP: () => {
					playPause();
				},
				onCtrlN: () => {
					playBackForth(true);
				},
				onCtrlM: () => {
					playBackForth(false);
				}
			});
		}
	});
	onDestroy(() => {
		if (editor && markdownMap.draft) {
			editor.destroy();
			console.log('destroy');
		}
	});
</script>

{#if editor}
	<BubbleMenuView {editor} />
	<SlashCommandView {editor} {currentTime} {playTimeBlock} />
{/if}
<!-- {#if editor && markdownMap.draft}
	<BubbleMenuView {editor} />
	<SlashCommandView {editor} {currentTime} {playTimeBlock} />
{/if} -->

<div>123</div>
<div
	class={cn(
		// !markdownMap.draft ? 'opacity-0' : 'opacity-100',
		'min-h-20',
		'm-1.5 flex max-h-150 flex-col items-center overflow-auto rounded-lg border border-border bg-card px-4 py-2',
		'transition-[color,box-shadow] has-focus-visible:border-ring has-focus-visible:ring-[3px]  has-focus-visible:ring-ring/50'
	)}
>
	<div
		class={cn(
			'prose prose-base prose-slate dark:prose-invert prose-ol:list-decimal prose-ul:list-disc prose-li:marker:text-primary w-full max-w-none font-sans',
			'[&_li_p]:m-0!'
		)}
		data-slot="input-group-control"
	>
		<div class="min-w-0 wrap-anywhere!" bind:this={editorContainer}></div>
	</div>
</div>

<!-- {#if !markdownMap.draft}
	<div class="my-2">
		<Button
			onclick={async () => {
				markdownMap = await createMarkdown({
					echoId,
					content: null,
					type: 'draft'
				});
			}}
			disabled={$effect.pending() > 0}
		>
			Create Draft</Button
		>
	</div>
{/if} -->
