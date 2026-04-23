<script lang="ts">
	import { fade } from 'svelte/transition';
	import { ProseView, type ProsemirrorDocData } from './prose-view.svelte';
	import BubbleMenuView from './bubble-menu-view.svelte';
	import { cn } from '$lib/utils';
	import SlashCommandView from './slash-command-view.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { onDestroy, untrack } from 'svelte';
	import { markVideoDone, updateVideoMarkdown } from '$lib/remote/video.remote';
	import { getClientTz } from '$lib/utils/tz';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';

	interface Props {
		videoId: string;
		content: unknown;
		status: 'done' | 'unfinished';
		currentTime: number;
		playTimeBlock: (v: number) => void;
		playPause: () => void;
		playBackForth: (b: boolean) => void;
	}
	let {
		videoId,
		content,
		status: initialStatus,
		currentTime,
		playTimeBlock,
		playPause,
		playBackForth
	}: Props = $props();

	let editor: ProseView | null = $state(null);
	let editorContainer: HTMLDivElement;
	let saveTimeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
	let lastId: string | null = null;

	let saving = $state(false);

	let status = $derived(initialStatus);

	const debouncedSave = (cb: () => void, delay = 600) => {
		if (saveTimeoutId) {
			clearTimeout(saveTimeoutId);
		}

		saveTimeoutId = setTimeout(() => cb(), delay);
	};

	function storeMarkdown(data: ProsemirrorDocData) {
		saving = true;
		updateVideoMarkdown({ videoId, content: data }).then(() => {
			saving = false;
		});
	}

	let markdownContent = $derived(content);

	$effect(() => {
		if (videoId === lastId) return;
		lastId = videoId;

		if (saveTimeoutId) {
			clearTimeout(saveTimeoutId);
			saveTimeoutId = undefined;
		}
		editor?.destroy();
		editor = null;

		editor = new ProseView(
			editorContainer,
			untrack(() => content ?? ''),
			{
				onUpdate: (data) => debouncedSave(() => storeMarkdown(data)),
				onPlayPause: playPause,
				onSeekBack: () => playBackForth(true),
				onSeekForward: () => playBackForth(false)
			}
		);
	});

	// Keep handlers live if the parent re-binds them.
	$effect(() => {
		editor?.setHandlers({
			onUpdate: (data) => debouncedSave(() => storeMarkdown(data)),
			onPlayPause: playPause,
			onSeekBack: () => playBackForth(true),
			onSeekForward: () => playBackForth(false)
		});
	});

	onDestroy(() => {
		if (saveTimeoutId) clearTimeout(saveTimeoutId);
		editor?.destroy();
	});
</script>

{#if editor && markdownContent}
	<BubbleMenuView {editor} />
	<SlashCommandView {editor} {currentTime} {playTimeBlock} />
{/if}

<div class="flex h-full min-h-0 flex-col">
	<div
		class={cn(
			'min-h-0 flex-1',
			'flex flex-col rounded-lg border border-border bg-sidebar',
			'm-1.5 overflow-hidden transition-[color,box-shadow] has-focus-visible:border-ring has-focus-visible:ring-[3px]  has-focus-visible:ring-ring/50'
		)}
	>
		<div class="flex min-h-0 flex-1 flex-col overflow-auto">
			<div
				class={cn(
					'prose prose-base flex w-full max-w-none flex-1 flex-col px-4 font-sans prose-slate dark:prose-invert prose-ol:list-decimal prose-ul:list-disc prose-li:marker:text-primary',
					'[&_li_p]:m-0!'
				)}
			>
				<div class="min-w-0 flex-1 wrap-anywhere!" bind:this={editorContainer}></div>
			</div>
		</div>
		<div
			class="flex w-full shrink-0 items-center justify-between border-t bg-muted/30 px-6 py-2 text-xs"
		>
			{#if saving}
				<div class="flex items-center gap-2 text-muted-foreground" in:fade>
					<span class="size-1.5 animate-pulse rounded-full bg-amber-500"></span>
					<span class="font-medium tracking-wider">Saving</span>
				</div>
			{:else}
				<div class="flex items-center gap-2 text-muted-foreground">
					<span class="size-1.5 rounded-full bg-emerald-500/80"></span>
					<span class="font-medium tracking-wider">Saved</span>
				</div>
			{/if}
			{#if status === 'unfinished'}
				<Button
					size="xs"
					variant="ghost"
					class="gap-1.5 text-muted-foreground hover:text-primary"
					onclick={async () => {
						await markVideoDone({ videoId, tz: getClientTz() });
						status = 'done';
					}}
				>
					<SparklesIcon class="size-3.5" />
					Complete
				</Button>
			{:else}
				<div class="flex gap-1.5 text-muted-foreground hover:text-primary">
					<CircleCheckIcon class="size-3.5" />
					Done
				</div>
			{/if}
		</div>
	</div>
</div>
