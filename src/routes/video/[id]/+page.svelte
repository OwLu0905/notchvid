<script lang="ts">
	import ProsemirrorMarkdown from '$lib/components/markdown/prosemirror-markdown.svelte';
	import type { TSLIDER_VALUES } from '$lib/components/yt/types.js';
	import YtAction from '$lib/components/yt/yt-action.svelte';
	import { setSliderContext } from '$lib/components/yt/yt-keys.js';
	import YtPlayer from '$lib/components/yt/yt-player.svelte';

	let { params } = $props();
	let markdownLoaded = $state(false);
	let echoId = $derived(params.id);

	let markdownMap: any = $state.raw({
		draft: 'Start',
		summary: undefined
	});

	// action
	let sliderValues: TSLIDER_VALUES = $state([0, 100]);
	let progressValue = $state(0);
	let ytActionRef: YtAction | null = $state(null);
	let selectedGroupId: string | undefined = $state(undefined);
	setSliderContext({
		getSliderValues: () => sliderValues
	});

	$effect(() => {
		// NOTE: navigation issue
		echoId;
		// getEchoSessionData(echoId).then((i) => {
		// 	data = i;
		// });

		// markdownLoaded = false;
		// getMarkdown(echoId).then((i) => {
		// 	markdownLoaded = true;
		// 	markdownMap = i;
		// });
	});
	function playTimeBlock(sec: number) {
		ytActionRef?.seekTo(sec, true);
	}

	function playPause() {
		ytActionRef?.playPause();
	}

	function playBackForth(back = true) {
		ytActionRef?.playBackForth(back);
	}
	let videoId = $derived(['19OKvadH_D0', 'tdIUMkXxtHg'][(echoId ? +echoId : 1) - 1]);
</script>

<div class="flex w-full p-10">
	{#key echoId}
		<YtPlayer {videoId}>
			{#snippet action()}
				<YtAction
					bind:this={ytActionRef}
					bind:sliderValues
					bind:progressValue
					{echoId}
					bind:selectedGroupId
				/>
			{/snippet}
		</YtPlayer>
	{/key}
	{#key echoId}
		<ProsemirrorMarkdown
			{echoId}
			bind:markdownMap
			currentTime={progressValue}
			{playTimeBlock}
			{playPause}
			{playBackForth}
		/>
	{/key}
</div>
