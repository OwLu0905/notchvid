<script module>
	import { browser } from '$app/environment';

	let YouTube: typeof window.YT.Player | null = $state(null);

	let player: InstanceType<typeof window.YT.Player> | null = $state(null);

	if (browser) {
		function tryAssignYouTube() {
			if (!YouTube && window?.YT?.Player) {
				YouTube = window.YT.Player;
			}
		}

		window.onYouTubeIframeAPIReady = () => {
			tryAssignYouTube();
		};
		if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
			const tag = document.createElement('script');
			tag.src = 'https://www.youtube.com/iframe_api';
			const firstScriptTag = document.getElementsByTagName('script')[0];
			firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
		} else {
			tryAssignYouTube();
		}
	}
</script>

<script lang="ts">
	import { getContext, onDestroy, onMount, setContext, type Snippet } from 'svelte';

	import { ytKey } from './yt-keys';
	import { sliderValuesKey } from './yt-keys';

	import type { YouTubePlayerContext, YouTubeSliderContext } from './types';
	import { fade } from 'svelte/transition';

	interface Props {
		action?: Snippet;
		videoId: string;
		children?: Snippet;
		isLiteLoad?: boolean;
	}

	let playerContainer: HTMLElement | null = $state(null);

	let isReady = $state(false);
	let initError = $state<string | null>(null);

	let { videoId, action, children, isLiteLoad = true }: Props = $props();

	let thumbnailUrl = $derived(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);

	let liteLoaded = $state(!isLiteLoad);

	setContext<YouTubePlayerContext>(ytKey, {
		getPlayer: () => player,
		getReady: () => isReady,
		getError: () => initError
	});

	const { getSliderValues } = getContext<YouTubeSliderContext>(sliderValuesKey);

	const sliderValues = getSliderValues();

	onMount(() => {
		if (!YouTube) return;
		if (!playerContainer) return;

		player = new YouTube(playerContainer, {
			videoId,
			playerVars: {
				rel: 0,
				autoplay: !isLiteLoad ? 0 : !action && liteLoaded ? 1 : 0,
				origin: 'https://www.youtube.com'
			},
			events: {
				onReady: (event) => {
					console.log('Ready', videoId);
					isReady = true;
					sliderValues[0] = 0;
					sliderValues[1] = event.target.getDuration();
				},
				onError: (e) => {
					console.error('YouTube player error:', e);
					initError = 'Failed to play video';
				}
			}
		});
	});

	onDestroy(() => {
		if (player) {
			player.destroy();
		}
	});
</script>

{#if !action && !liteLoaded}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		aria-label="Play YouTube video"
		role="button"
		tabindex="0"
		onclick={() => {
			liteLoaded = true;
		}}
		class="relative aspect-video h-[360px] w-[640px] max-w-full cursor-pointer overflow-hidden bg-black bg-cover bg-center bg-repeat"
		style="background-image:url({thumbnailUrl});"
	>
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
			<svg viewBox="0 0 68 48" width="68" height="48">
				<path
					d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z"
					fill="#f00"
				></path>
				<path d="M 45,24 27,14 27,34" fill="#fff"></path>
			</svg>
		</div>
	</div>
{/if}

<div class="relative" in:fade>
	{#if action || liteLoaded}
		<div class="aspect-video h-auto w-full max-w-full py-2" bind:this={playerContainer}></div>
		{#if children}
			{@render children()}
		{/if}
		{#if action && isReady}
			{@render action()}
		{/if}
	{/if}
</div>
