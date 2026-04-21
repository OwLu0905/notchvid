<script lang="ts">
	import { cn, formatSecondsToMMSS } from '$lib/utils';
	import { Play, Pause, RotateCcw, Plus, Minus, Scissors, Settings2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Toggle, { toggleVariants } from '$lib/components/ui/toggle/toggle.svelte';
	// import { createAudioGroup } from '$lib/remote/echo/data.remote';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import { getYtContext } from './yt-keys';
	import { Slider as YtSlider } from './yt-slider/index.js';
	import type { TSLIDER_VALUES } from './types';

	interface Props {
		sliderValues: TSLIDER_VALUES;
		progressValue: number;
		echoId: string;

		// workaround
		selectedGroupId: string | undefined;
	}

	let {
		sliderValues = $bindable(),
		progressValue = $bindable(),
		echoId,
		selectedGroupId = $bindable(undefined)
	}: Props = $props();

	const { getPlayer, getReady } = getYtContext();

	let player = $derived(getPlayer());
	let isReady = $derived(getReady());
	let isProgrammaticPlay = $state(false);

	let duration = $derived(player?.getDuration());

	let playState = $state(window.YT.PlayerState.UNSTARTED);

	const rateListBack = [0.5, 0.75, 1];
	const rateListForward = [1.25, 1.5, 2];

	let playBackRate = $state(1);
	let slideExtend = $state(false);

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

<div
	class={cn(
		'relative mb-1 flex w-full items-center gap-2.5 pt-2 pb-4',
		slideExtend ? 'w-[150%]' : 'w-full'
	)}
>
	{#key slideExtend}
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
	{/key}

	<div>
		<Button
			size="sm"
			variant="ghost"
			onclick={() => {
				slideExtend = !slideExtend;
			}}
		>
			<span class="text-xs tabular-nums">
				{formatSecondsToMMSS(Math.floor(progressValue))}
			</span>
		</Button>
	</div>

	<!-- <div class="absolute bottom-0 left-0 z-5 w-full translate-x-1/2"> -->
	<!-- 	<Button size="icon-sm" variant="ghost"> -->
	<!-- 		<Forward /> -->
	<!-- 	</Button> -->
	<!-- </div> -->
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
						playeVideo(true);
					}}
					disabled={!isReady}
				>
					<RotateCcw />
				</Button>
				<!-- <Button -->
				<!-- 	class="" -->
				<!-- 	type="button" -->
				<!-- 	variant="ghost" -->
				<!-- 	onclick={() => { -->
				<!-- 		playBackForth(true); -->
				<!-- 	}} -->
				<!-- > -->
				<!-- 	<UndoDot /> -->
				<!-- </Button> -->
				<!-- <Button -->
				<!-- 	class="" -->
				<!-- 	type="button" -->
				<!-- 	variant="ghost" -->
				<!-- 	onclick={() => { -->
				<!-- 		if (player?.getCurrentTime() !== undefined && duration) { -->
				<!-- 			const seekEndValue = Math.min(Math.floor(player?.getCurrentTime()) + 5, duration); -->
				<!-- 			sliderValues = [sliderValues[0], seekEndValue]; -->
				<!-- 		} -->
				<!-- 	}} -->
				<!-- 	disabled={!isReady} -->
				<!-- > -->
				<!-- 	<ArrowUpRight /> -->
				<!-- </Button> -->

				<Button
					class=""
					type="button"
					variant="ghost"
					onclick={async () => {
						// const result = await createAudioGroup({
						// 	echoId,
						// 	start: $state.snapshot(sliderValues[0]),
						// 	end: $state.snapshot(sliderValues[1])
						// });
						// selectedGroupId = `${result[0].id}`;
					}}
					disabled={!isReady}
				>
					<Scissors />
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
					class=""
					size="icon-sm"
					type="button"
					variant="ghost"
					onclick={() => {
						if (!duration || !player) return;
						const addValue = Math.min(player.getCurrentTime() + 2, duration);
						sliderValues[0] = player.getCurrentTime();
						sliderValues[1] = addValue;
					}}
					disabled={!isReady}
				>
					<Settings2 />
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
