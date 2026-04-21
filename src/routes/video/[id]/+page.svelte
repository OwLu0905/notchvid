<script lang="ts">
	import ProsemirrorMarkdown from '$lib/components/markdown/prosemirror-markdown.svelte';

	let { params } = $props();
	let markdownLoaded = $state(false);
	let echoId = $derived(params.id);

	let progressValue = $state(0);
	let markdownMap: any = $state.raw({
		draft: undefined,
		summary: undefined
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
		// ytActionRef?.seekTo(sec, true);
	}

	function playPause() {
		// ytActionRef?.playPause();
	}

	function playBackForth(back = true) {
		// ytActionRef?.playBackForth(back);
	}
</script>

<div class="p-10">
	<ProsemirrorMarkdown
		{echoId}
		bind:markdownMap
		currentTime={progressValue}
		{playTimeBlock}
		{playPause}
		{playBackForth}
	/>
</div>
