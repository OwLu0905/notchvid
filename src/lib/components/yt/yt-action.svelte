<script lang="ts">
	import { cn, formatSecondsToMMSS } from '$lib/utils';
	import {
		Play,
		Pause,
		RotateCcw,
		Plus,
		Minus,
		UndoDot,
		ArrowUpRight,
		Captions,
		CaptionsOff
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Toggle, { toggleVariants } from '$lib/components/ui/toggle/toggle.svelte';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import { getYtContext } from './yt-keys';
	import { Slider as YtSlider } from './yt-slider/index.js';
	import type { TSLIDER_VALUES } from './types';

	interface Props {
		sliderValues: TSLIDER_VALUES;
		progressValue: number;
	}

	let { sliderValues = $bindable(), progressValue = $bindable() }: Props = $props();

	const { getPlayer, getReady } = getYtContext();

	let player = $derived(getPlayer());
	let isReady = $derived(getReady());
	let isProgrammaticPlay = $state(false);

	let duration = $derived(player?.getDuration());

	let playState = $state(window.YT.PlayerState.UNSTARTED);

	const rateListBack = [0.5, 0.75, 1];
	const rateListForward = [1.25, 1.5, 2];

	let playBackRate = $state(1);
	let captionsOn = $state(false);

	function clickPlaybackRate(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		}
	) {
		if (e.target instanceof HTMLElement) {
			const dataRate = e.target.dataset['rate'];
			const rate = dataRate ? +dataRate : 1;
			player?.setPlaybackRate(rate);
			playBackRate = rate;
		}
	}

	$effect(() => {
		if (!player) return;

		let timer: any = 0;
		const playChange = (event: YT.OnStateChangeEvent) => {
			playState = event.data;

			if (event.data === window.YT.PlayerState.PLAYING) {
				timer = setInterval(() => {
					progressValue = player.getCurrentTime();
					if (Math.floor(progressValue) >= sliderValues[1] && isProgrammaticPlay) {
						player.pauseVideo();
					}
				}, 100);
			} else {
				if (timer) {
					clearInterval(timer);
					timer = null;
				}
			}

			if (event.data === window.YT.PlayerState.ENDED) {
				progressValue = duration ?? 100;
			}

			if (
				event.data === window.YT.PlayerState.PAUSED ||
				event.data === window.YT.PlayerState.ENDED
			) {
				isProgrammaticPlay = false;
			}
		};

		const playbackRateChange = (event: YT.OnPlaybackRateChangeEvent) => {
			playBackRate = event.data;
		};

		player.addEventListener('onStateChange', playChange);
		player.addEventListener('onPlaybackRateChange', playbackRateChange);

		return () => {
			progressValue = 0;
			player.removeEventListener('onStateChange', playChange);
			player.removeEventListener('onPlaybackRateChange', playbackRateChange);
			if (timer) {
				clearInterval(timer);
				timer = null;
			}
		};
	});

	export function seekTo(sec: number, allowSeekAhead: boolean = false) {
		isProgrammaticPlay = false;
		player?.seekTo(sec, allowSeekAhead);

		if (playState !== window.YT.PlayerState.PLAYING) {
			player?.playVideo();
		}
	}

	export function playPause() {
		if (playState !== window.YT.PlayerState.PLAYING) {
			player?.playVideo();
		} else {
			player?.pauseVideo();
		}
	}

	// setOption/getOption are valid YT iframe API methods at runtime but
	// absent from @types/youtube, so cast to access them.
	// kind === 'asr' marks an auto-generated track; other fields vary, so keep
	// the rest of the shape open and pass the whole object back to setOption.
	type CaptionsTrack = { languageCode: string; kind?: string; [key: string]: unknown };
	type CaptionsPlayer = YT.Player & {
		setOption: (module: string, option: string, value: unknown) => void;
		getOption: <T = unknown>(module: string, option: string) => T | undefined;
	};

	export function toggleCaptions() {
		if (!player) return;
		const p = player as CaptionsPlayer;
		if (captionsOn) {
			p.setOption('captions', 'track', {});
			captionsOn = false;
			return;
		}

		// Prefer the tracklist: pick English, else the first available track.
		const tracks = p.getOption<CaptionsTrack[]>('captions', 'tracklist');
		let target = tracks?.find((t) => t.languageCode === 'en') ?? tracks?.[0];

		// Auto-generated (ASR) videos report an empty tracklist and an empty active
		// track while captions are off, so there's no object to copy. They do expose
		// translation languages, which a caption-less video won't — use that as the
		// signal, then request the auto track by kind for YT to resolve.
		if (!target) {
			const translations = p.getOption<unknown[]>('captions', 'translationLanguages');
			if (translations?.length) target = { languageCode: 'en', kind: 'asr' };
		}

		// Nothing to show (module not ready, or video has no captions) — bail rather
		// than flip the toggle on with no visible captions.
		if (!target) return;

		p.setOption('captions', 'track', target);
		captionsOn = true;
	}

	export function playBackForth(back: boolean = true) {
		if (!player) return;
		let gap = 0;
		if (back) {
			gap = Math.max(player.getCurrentTime() - 2.5, 0);
		} else {
			gap = Math.min(player.getCurrentTime() + 2.5, player.getDuration());
		}

		player?.seekTo(gap, true);

		if (playState !== window.YT.PlayerState.PLAYING) {
			player?.playVideo();
		}
	}

	function playeVideo(replay = false) {
		if (!player) return;
		if (replay) {
			player.seekTo(sliderValues[0], true);
		}

		if (playState !== window.YT.PlayerState.PLAYING) {
			player.playVideo();
		}

		const value = player.getCurrentTime();
		if (replay || value <= sliderValues[1]) {
			isProgrammaticPlay = true;
		}
	}

	function pauseVideo() {
		isProgrammaticPlay = false;
		player?.pauseVideo();
	}
</script>

<div class={cn('relative mb-1 flex w-full items-center gap-2.5 px-2')}>
	<YtSlider
		type="multiple"
		bind:value={sliderValues}
		max={duration}
		step={1}
		class="z-5 h-13 flex-1 self-center"
		format={formatSecondsToMMSS}
		tickLabel={progressValue}
		seek={(v) => {
			seekTo(v, true);
		}}
		onValueCommit={(v) => {
			// if (v[0] > progressValue) {
			// seekTo(v[0], true);
			// }
		}}
	/>

	<div>
		<span class="text-xs tabular-nums">
			{formatSecondsToMMSS(Math.floor(progressValue))}
		</span>
	</div>
</div>

<div class="flex flex-col items-center rounded-xl bg-card px-4 py-2 md:py-2">
	<div class="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
		<button
			class="col-span-3 col-start-1 flex justify-center gap-x-2 xl:col-span-1 xl:justify-self-start"
			onclick={(e) => clickPlaybackRate(e)}
		>
			{#each rateListBack as i}
				<div
					data-rate={i}
					data-state={i === playBackRate ? 'on' : 'off'}
					class={cn(toggleVariants({ variant: 'default', size: 'sm' }), 'text-xs')}
				>
					{i}
				</div>
			{/each}

			{#each rateListForward as i}
				<Toggle data-rate={i} pressed={i === playBackRate} class="text-xs xl:hidden" size="sm">
					{i}
				</Toggle>
			{/each}
		</button>

		<div class="col-span-3 col-start-1 flex justify-center gap-0.5 xl:col-span-1 xl:col-start-2">
			<div class="flex items-center justify-center gap-2">
				<ButtonGroup.Root>
					<Button
						class=""
						size="icon-sm"
						type="button"
						variant="ghost"
						onclick={() => {
							const minusValue = Math.max(sliderValues[0] - 1, 0);
							sliderValues = [minusValue, sliderValues[1]];
						}}
						disabled={!isReady}
					>
						<Minus />
					</Button>
					<Button
						class=""
						size="icon-sm"
						type="button"
						variant="ghost"
						onclick={() => {
							if (!duration) return;

							const addValue = Math.min(sliderValues[0] + 1, duration);
							sliderValues = [addValue, sliderValues[1]];
						}}
						disabled={!isReady}
					>
						<Plus />
					</Button>
				</ButtonGroup.Root>

				<Button
					class=""
					type="button"
					variant="ghost"
					onclick={() => {
						playeVideo(true);
					}}
					disabled={!isReady}
				>
					<RotateCcw />
				</Button>

				{#if playState !== window.YT.PlayerState.PLAYING}
					<Button
						class=""
						tabindex={0}
						type="button"
						variant="ghost"
						onclick={() => playeVideo()}
						disabled={!isReady}
					>
						<Play />
					</Button>
				{/if}

				{#if playState === window.YT.PlayerState.PLAYING}
					<Button
						class=""
						tabindex={0}
						type="button"
						variant="ghost"
						onclick={pauseVideo}
						disabled={!isReady}
					>
						<Pause />
					</Button>
				{/if}
				<Button
					class=""
					type="button"
					variant="ghost"
					onclick={() => {
						playBackForth(true);
					}}
				>
					<UndoDot />
				</Button>
				<Button
					class=""
					type="button"
					variant="ghost"
					onclick={() => {
						if (player?.getCurrentTime() !== undefined && duration) {
							const seekEndValue = Math.min(Math.floor(player?.getCurrentTime()) + 5, duration);
							sliderValues = [sliderValues[0], seekEndValue];
						}
					}}
					disabled={!isReady}
				>
					<ArrowUpRight />
				</Button>

				<ButtonGroup.Root>
					<Button
						class=""
						size="icon-sm"
						type="button"
						variant="ghost"
						onclick={() => {
							const minusValue = Math.max(sliderValues[1] - 1, 0);
							sliderValues = [sliderValues[0], minusValue];
						}}
						disabled={!isReady}
					>
						<Minus />
					</Button>
					<Button
						class=""
						size="icon-sm"
						type="button"
						variant="ghost"
						onclick={() => {
							if (!duration) return;

							const addValue = Math.min(sliderValues[1] + 1, duration);
							sliderValues = [sliderValues[0], addValue];
						}}
						disabled={!isReady}
					>
						<Plus />
					</Button>
				</ButtonGroup.Root>

				<Button
					type="button"
					variant="ghost"
					aria-pressed={captionsOn}
					title={captionsOn ? 'Hide captions (Alt+C)' : 'Show captions (Alt+C)'}
					onclick={toggleCaptions}
					disabled={!isReady}
				>
					{#if captionsOn}
						<Captions />
					{:else}
						<CaptionsOff />
					{/if}
				</Button>
			</div>
		</div>

		<button
			class="hidden gap-x-2 justify-self-end xl:col-start-3 xl:hidden"
			onclick={clickPlaybackRate}
		>
			{#each rateListForward as i}
				<Toggle data-rate={i} pressed={i === playBackRate} class="text-xs" size="sm">
					{i}
				</Toggle>
			{/each}
		</button>
	</div>
</div>
