<script lang="ts">
	import { fade } from 'svelte/transition';
	import { ProseView, type ProsemirrorDocData } from './prose-view.svelte';
	import BubbleMenuView from './bubble-menu-view.svelte';
	import { cn } from '$lib/utils';
	import SlashCommandView from './slash-command-view.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { onDestroy, onMount } from 'svelte';
	import { markVideoDone, updateVideoMarkdown } from '$lib/remote/video.remote';
	import { getClientTz } from '$lib/utils/tz';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import { DOMSerializer, Node as PMNode } from 'prosemirror-model';
	import { editorSchema } from './schema';

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

	const DEBOUNCE_MS = 1500;
	const MAX_WAIT_MS = 10_000;
	const storageKey = (id: string) => `notchvid:editor:${id}`;
	const decidedKey = (id: string) => `notchvid:editor:decided:${id}`;

	type LocalEntry = {
		content: ProsemirrorDocData;
		hash: string;
		updatedAt: number;
	};

	let editor: ProseView | null = $state(null);
	let editorContainer: HTMLDivElement;
	let saving = $state(false);
	let status = $derived(initialStatus);

	let restorePrompt: { content: ProsemirrorDocData; updatedAt: number } | null = $state(null);

	let pendingData: ProsemirrorDocData | null = null;
	let lastSavedHash = '';
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;

	function stableStringify(value: unknown): string {
		if (value === null || typeof value !== 'object') return JSON.stringify(value);
		if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
		const obj = value as Record<string, unknown>;
		const keys = Object.keys(obj).sort();
		return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
	}

	function hashContent(data: ProsemirrorDocData): string {
		return stableStringify(data ?? null);
	}

	function readLocal(id: string): LocalEntry | null {
		try {
			const raw = localStorage.getItem(storageKey(id));
			if (!raw) return null;
			return JSON.parse(raw) as LocalEntry;
		} catch {
			return null;
		}
	}

	function writeLocal(id: string, data: ProsemirrorDocData, hash: string) {
		try {
			const entry: LocalEntry = { content: data, hash, updatedAt: Date.now() };
			localStorage.setItem(storageKey(id), JSON.stringify(entry));
		} catch {
			// quota exceeded or storage disabled — non-fatal
		}
	}

	function clearLocal(id: string) {
		try {
			localStorage.removeItem(storageKey(id));
		} catch {
			// ignore
		}
	}

	function markDecided(id: string, hash: string) {
		try {
			sessionStorage.setItem(decidedKey(id), hash);
		} catch {
			// ignore
		}
	}

	function isDecided(id: string, hash: string): boolean {
		try {
			return sessionStorage.getItem(decidedKey(id)) === hash;
		} catch {
			return false;
		}
	}

	async function flush() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = undefined;
		}
		if (maxWaitTimer) {
			clearTimeout(maxWaitTimer);
			maxWaitTimer = undefined;
		}
		if (saving) return;
		if (!pendingData) return;

		const data = pendingData;
		const hash = hashContent(data);
		if (hash === lastSavedHash) {
			pendingData = null;
			clearLocal(videoId);
			return;
		}

		pendingData = null;
		saving = true;
		try {
			await updateVideoMarkdown({ videoId, content: data });
			lastSavedHash = hash;
			if (!pendingData) clearLocal(videoId);
		} catch {
			// Local entry stays as recovery; next edit will repopulate pendingData and retry.
		} finally {
			saving = false;
		}
	}

	function scheduleSave(data: ProsemirrorDocData) {
		const hash = hashContent(data);
		if (hash === lastSavedHash) {
			pendingData = null;
			clearLocal(videoId);
			return;
		}

		pendingData = data;
		writeLocal(videoId, data, hash);

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(flush, DEBOUNCE_MS);
		if (!maxWaitTimer) maxWaitTimer = setTimeout(flush, MAX_WAIT_MS);
	}

	function mountEditor(initial: unknown) {
		editor?.destroy();
		editor = new ProseView(editorContainer, (initial ?? '') as Object | string, {
			onUpdate: (data) => scheduleSave(data),
			onPlayPause: playPause,
			onSeekBack: () => playBackForth(true),
			onSeekForward: () => playBackForth(false)
		});
	}

	function restoreLocal() {
		if (!restorePrompt || !editor) return;
		const local = restorePrompt;
		markDecided(videoId, hashContent(local.content));
		restorePrompt = null;
		editor.setContent(local.content as object);
		flush();
	}

	function discardLocal() {
		if (restorePrompt) markDecided(videoId, hashContent(restorePrompt.content));
		restorePrompt = null;
		clearLocal(videoId);
	}

	onMount(() => {
		const initialContent = content as ProsemirrorDocData;
		lastSavedHash = hashContent(initialContent);

		const local = readLocal(videoId);
		if (local && local.hash !== lastSavedHash && !isDecided(videoId, local.hash)) {
			restorePrompt = { content: local.content, updatedAt: local.updatedAt };
		} else if (local && local.hash === lastSavedHash) {
			clearLocal(videoId);
		}

		mountEditor(initialContent);
	});

	// Keep handlers live if the parent re-binds them.
	$effect(() => {
		editor?.setHandlers({
			onUpdate: (data) => scheduleSave(data),
			onPlayPause: playPause,
			onSeekBack: () => playBackForth(true),
			onSeekForward: () => playBackForth(false)
		});
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		if (maxWaitTimer) clearTimeout(maxWaitTimer);
		editor?.destroy();
	});

	let markdownContent = $derived(content);

	function docToHtml(doc: unknown): string {
		if (!doc || typeof document === 'undefined') return '';
		try {
			const node = PMNode.fromJSON(editorSchema, doc);
			const tmp = document.createElement('div');
			tmp.appendChild(DOMSerializer.fromSchema(editorSchema).serializeFragment(node.content));
			return tmp.innerHTML;
		} catch {
			return '';
		}
	}

	let serverHtml = $derived.by(() => (restorePrompt ? docToHtml(content) : ''));
	let localHtml = $derived.by(() => {
		const local = restorePrompt;
		return local ? docToHtml(local.content) : '';
	});

	function formatRelative(ts: number): string {
		const diff = Date.now() - ts;
		const min = Math.floor(diff / 60_000);
		if (min < 1) return 'just now';
		if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
		const hr = Math.floor(min / 60);
		if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
		const day = Math.floor(hr / 24);
		return `${day} day${day === 1 ? '' : 's'} ago`;
	}
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

<AlertDialog.Root
	open={restorePrompt !== null}
	onOpenChange={(open) => {
		if (!open && restorePrompt) restorePrompt = null;
	}}
>
	<AlertDialog.Content class="max-w-[95vw]! sm:max-w-6xl">
		<AlertDialog.Header>
			<AlertDialog.Title>Unsaved changes found</AlertDialog.Title>
			<AlertDialog.Description>
				You have local edits from
				<span class="font-medium"
					>{restorePrompt ? formatRelative(restorePrompt.updatedAt) : ''}</span
				>
				that haven't been synced to the server. Compare the two versions below.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="flex flex-col gap-3 sm:flex-row">
			<div class="flex min-w-0 flex-1 flex-col">
				<div class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
					<span class="size-2 rounded-sm bg-rose-500/60"></span>
					Server (current)
				</div>
				<div
					class={cn(
						'max-h-[30vh] overflow-auto rounded-md border bg-sidebar p-4 wrap-anywhere sm:max-h-[45vh]',
						'prose prose-sm max-w-none font-sans prose-slate dark:prose-invert prose-ol:list-decimal prose-ul:list-disc prose-li:marker:text-primary',
						'[&_li_p]:m-0!'
					)}
				>
					{@html serverHtml}
				</div>
			</div>
			<div class="flex min-w-0 flex-1 flex-col">
				<div class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
					<span class="size-2 rounded-sm bg-emerald-500/80"></span>
					Local
				</div>
				<div
					class={cn(
						'max-h-[30vh] overflow-auto rounded-md border bg-sidebar p-4 wrap-anywhere sm:max-h-[45vh]',
						'prose prose-sm max-w-none font-sans prose-slate dark:prose-invert prose-ol:list-decimal prose-ul:list-disc prose-li:marker:text-primary',
						'[&_li_p]:m-0!'
					)}
				>
					{@html localHtml}
				</div>
			</div>
		</div>

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={discardLocal} class="gap-1.5">
				<span class="size-2 rounded-sm bg-rose-500/60"></span>
				Use server version
			</AlertDialog.Cancel>
			<AlertDialog.Action onclick={restoreLocal} class="gap-1.5">
				<span class="size-2 rounded-sm bg-emerald-500/80"></span>
				Restore local
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
