<script module>
	import { browser } from '$app/environment';

	let YouTube: typeof window.YT.Player | null = $state(null);

	if (browser) {
		function tryAssignYouTube() {
			if (!YouTube && window?.YT?.Player) {
				YouTube = window.YT.Player;
			}
		}

		const prevReady = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			prevReady?.();
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
	import { onDestroy, untrack, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	import { getSliderContext, setYtContext } from './yt-keys';
	import type YT from 'youtube';

	interface Props {
		action?: Snippet;
		videoId: string;
		children?: Snippet;
		isLiteLoad?: boolean;
	}

	let { videoId, action, children, isLiteLoad = true }: Props = $props();

	let player: YT.Player | null = $state(null);
	let playerContainer: HTMLElement | null = $state(null);
	let isReady = $state(false);
	let initError = $state<string | null>(null);
	let liteLoaded = $state(untrack(() => !isLiteLoad));

	let thumbnailUrl = $derived(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
	let thumbnailFallback = $derived(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);

	setYtContext({
		getPlayer: () => player,
		getReady: () => isReady,
		getError: () => initError
	});

	const { getSliderValues } = getSliderContext();
	const sliderValues = getSliderValues();

	const AutoPlay = {
		NoAutoPlay: 0,
		AutoPlay: 1
	};

	$effect(() => {
		const nextVideoId = videoId;
		const Ctor = YouTube;
		const container = playerContainer;
		if (!Ctor || !container) return;

		untrack(() => {
			if (player) {
				player.loadVideoById(nextVideoId);
				return;
			}
			const autoplay =
				!isLiteLoad || (!action && liteLoaded) ? AutoPlay.AutoPlay : AutoPlay.NoAutoPlay;

			player = new Ctor(container, {
				videoId: nextVideoId,
				playerVars: {
					rel: 0,
					autoplay,
					origin: 'https://www.youtube.com'
				},
				events: {
					onReady: (event) => {
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
	});

	onDestroy(() => {
		try {
			player?.destroy();
		} catch (e) {
			console.error('Failed to destroy YouTube player:', e);
		}
		player = null;
	});

	function activateLite() {
		liteLoaded = true;
	}

	function handleLiteKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			activateLite();
		}
	}
</script>

{#if !action && !liteLoaded}
	<div
		aria-label="Play YouTube video"
		role="button"
		tabindex="0"
		onclick={activateLite}
		onkeydown={handleLiteKeydown}
		class="relative aspect-video h-90 w-160 max-w-full cursor-pointer overflow-hidden bg-black"
	>
		<img
			src={thumbnailUrl}
			alt=""
			class="absolute inset-0 h-full w-full object-cover"
			onerror={(e) => {
				const img = e.currentTarget as HTMLImageElement;
				if (img.src !== thumbnailFallback) img.src = thumbnailFallback;
			}}
		/>
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
		<div class="aspect-video h-auto w-full max-w-full rounded-lg" bind:this={playerContainer}></div>
		{#if children}
			{@render children()}
		{/if}
		{#if action && isReady}
			{@render action()}
		{/if}
	{/if}
</div>
