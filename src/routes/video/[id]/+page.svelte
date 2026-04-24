<script lang="ts">
	import ProsemirrorMarkdown from '$lib/components/markdown/prosemirror-markdown.svelte';
	import type { TSLIDER_VALUES } from '$lib/components/yt/types.js';
	import YtAction from '$lib/components/yt/yt-action.svelte';
	import { setSliderContext } from '$lib/components/yt/yt-keys.js';
	import YtPlayer from '$lib/components/yt/yt-player.svelte';
	import { getVideoWithMarkdown } from '$lib/remote/video.remote.js';

	let { params } = $props();
	let videoId = $derived(params.id);

	// action
	let sliderValues: TSLIDER_VALUES = $state([0, 100]);

	let progressValue = $state(0);
	let ytActionRef: YtAction | null = $state(null);

	setSliderContext({
		getSliderValues: () => sliderValues
	});

	let video = $derived(await getVideoWithMarkdown(videoId));

	function playTimeBlock(sec: number) {
		ytActionRef?.seekTo(sec, true);
	}

	function playPause() {
		ytActionRef?.playPause();
	}

	function playBackForth(back = true) {
		ytActionRef?.playBackForth(back);
	}
</script>

<div class="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden lg:flex-row">
	<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
		{#key videoId}
			<YtPlayer videoId={video.video.url}>
				{#snippet action()}
					<YtAction bind:this={ytActionRef} bind:sliderValues bind:progressValue />
				{/snippet}
			</YtPlayer>
		{/key}
	</div>
	<div
		class="flex h-1/2 min-h-0 w-full min-w-0 shrink-0 flex-col lg:h-full lg:w-[clamp(24rem,32vw,40rem)]"
	>
		{#key videoId}
			<ProsemirrorMarkdown
				{videoId}
				content={video.markdown?.content}
				status={video.video?.status}
				currentTime={progressValue}
				{playTimeBlock}
				{playPause}
				{playBackForth}
			/>
		{/key}
	</div>
</div>
