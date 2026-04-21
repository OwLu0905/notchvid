<script lang="ts">
	import { Slider as SliderPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		value = $bindable(),
		orientation = 'horizontal',
		tickLabel = $bindable(),
		format = (val: number) => String(val),
		class: className,
		seek,
		...restProps
	}: WithoutChildrenOrChild<SliderPrimitive.RootProps> & {
		format?: (value: number) => string;
		seek?: (value: number) => void;
		tickLabel?: number;
	} = $props();

	let thumb1Value = $derived.by(() => {
		if (Array.isArray(value)) {
			return value[0];
		}
		return null;
	});

	let thumb2Value = $derived.by(() => {
		if (Array.isArray(value)) {
			return value[1];
		}
		return null;
	});

	function overlapDetect(thumb: number) {
		const container = document.querySelector('#yt-slider');
		const detectOverlapElements = container?.querySelectorAll('[data-thumb-order]');

		if (!detectOverlapElements || detectOverlapElements.length < 2) return;
		const positions = Array.from(detectOverlapElements).map((el) => ({
			element: el,
			rect: el.getBoundingClientRect()
		}));

		const thumb1 = positions[thumb]; // dragging
		const thumb2 = positions[thumb ^ 1];

		const ele1 = thumb1.element as HTMLElement;
		const ele2 = thumb2.element as HTMLElement;

		const isOverlapping = !(
			thumb1.rect.right < thumb2.rect.left || thumb2.rect.right < thumb1.rect.left
		);

		// NOTE: should convert rem to px
		if (isOverlapping && ele1.style.transform !== 'translateY(calc(-100% - 1rem))') {
			ele2.style.transform = 'translateY(calc(-100% - 1rem))';
		}
		if (!isOverlapping) {
			ele1.style.transform = 'translateY(0)';
			ele2.style.transform = 'translateY(0)';
		}
	}

	$effect(() => {
		thumb1Value;
		overlapDetect(0);
	});

	$effect(() => {
		thumb2Value;
		overlapDetect(1);
	});

	// https://github.com/huntabyte/bits-ui/blob/798d69505806943dfa0d8c0d83e9f1ac0ca86e4d/packages/bits-ui/src/lib/bits/slider/slider.svelte.ts#L140
	function linearScale(input: readonly [number, number], output: readonly [number, number]) {
		return (value: number) => {
			if (input[0] === input[1] || output[0] === output[1]) return output[0];
			const ratio = (output[1] - output[0]) / (input[1] - input[0]);
			return output[0] + ratio * (value - input[0]);
		};
	}
	function roundToPrecision(num: number, precision: number): number {
		const factor = Math.pow(10, precision);
		return Math.round(num * factor) / factor;
	}
	function getDecimalPlaces(num: number): number {
		if (Math.floor(num) === num) return 0;
		const str = num.toString();
		if (str.indexOf('.') !== -1 && str.indexOf('e-') === -1) {
			return str.split('.')[1]!.length;
		} else if (str.indexOf('e-') !== -1) {
			const parts = str.split('e-');
			return parseInt(parts[1]!, 10);
		}
		return 0;
	}

	function normalizeSteps(step: number | number[], min: number, max: number): number[] {
		if (typeof step === 'number') {
			// generate regular steps - match original behavior exactly
			const difference = max - min;
			let count = Math.ceil(difference / step);

			// Get precision from step to avoid floating point errors
			const precision = getDecimalPlaces(step);

			// Check if difference is divisible by step using integer arithmetic to avoid floating point errors
			const factor = Math.pow(10, precision);
			const intDifference = Math.round(difference * factor);
			const intStep = Math.round(step * factor);

			if (intDifference % intStep === 0) {
				count++;
			}

			const steps: number[] = [];
			for (let i = 0; i < count; i++) {
				const value = min + i * step;
				// Round to the precision of the step to avoid floating point errors
				const roundedValue = roundToPrecision(value, precision);
				steps.push(roundedValue);
			}
			return steps;
		}

		return [...new Set(step)].filter((value) => value >= min && value <= max).sort((a, b) => a - b);
	}

	function snapValueToCustomSteps(value: number, steps: number[]): number {
		if (steps.length === 0) return value;

		// Find the closest step
		let closest = steps[0]!;
		let minDistance = Math.abs(value - closest);

		for (const step of steps) {
			const distance = Math.abs(value - step);
			if (distance < minDistance) {
				minDistance = distance;
				closest = step;
			}
		}

		return closest;
	}

	function applyPosition({
		clientXY,
		start,
		end
	}: {
		clientXY: number;
		start: number;
		end: number;
	}) {
		const min = 0;
		const max = restProps.max ?? 100;
		const percent = (clientXY - start) / (end - start);
		const val = percent * (max - min) + min;

		if (val < min) {
			return min;
		} else if (val > max) {
			return max;
		} else {
			const steps = normalizeSteps(restProps?.step ?? 1, min, max);
			const newValue = snapValueToCustomSteps(val, steps);
			return newValue;
		}
	}

	function getPointDuration(e: PointerEvent) {
		if (!e.target || !ref) return [0, 0];

		const sliderNodeBound = ref.getBoundingClientRect();
		const slotName = (e.target as HTMLElement).dataset['slot'];

		if (slotName !== 'slider-thumb' && slotName !== 'slider-thumb-label') {
			const start = sliderNodeBound.left ?? 0;
			const end = sliderNodeBound.right ?? 100;
			const timePosition = applyPosition({
				clientXY: e.clientX,
				start,
				end
			});

			const percentPadding = (14 / 2 / ref?.offsetWidth) * 100;
			const thumbScale = [percentPadding, 100 - percentPadding] as [number, number];
			const scale = linearScale([0, restProps.max ?? 100], thumbScale);
			const value = scale(timePosition);

			return [timePosition, value];
		}
		return [0, 0];
	}
	function handlePointDuration(e: PointerEvent) {
		if (!e.target || !ref) return;

		const sliderNodeBound = ref.getBoundingClientRect();
		const slotName = (e.target as HTMLElement).dataset['slot'];

		if (slotName !== 'slider-thumb' && slotName !== 'slider-thumb-label') {
			const start = sliderNodeBound.left ?? 0;
			const end = sliderNodeBound.right ?? 100;
			const timePosition = applyPosition({
				clientXY: e.clientX,
				start: start,
				end: end
			});

			seek?.(timePosition);
		}
	}

	let tickLeftLength = $derived.by(() => {
		if (tickLabel !== undefined && ref?.offsetWidth) {
			const percentPadding = (8 / 2 / ref?.offsetWidth) * 100;
			const thumbScale = [percentPadding, 100 - percentPadding] as [number, number];
			const scale = linearScale([0, restProps.max ?? 100], thumbScale);
			const value = scale(Math.floor(tickLabel));

			return value;
		}

		return null;
	});
</script>

<SliderPrimitive.Root
	id="yt-slider"
	bind:ref
	bind:value={value as never}
	data-slot="slider"
	{orientation}
	class={cn(
		'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
		className,
		'yt-slider after:rounded-sm after:bg-accent/60 after:px-1 after:py-0.5 after:text-[10px] after:text-foreground after:tabular-nums'
	)}
	{...restProps}
	onpointerdown={(e) => {
		if (!e.target) return;
		const slotName = (e.target as HTMLElement).dataset['slot'];
		if (slotName !== 'slider-thumb' && slotName !== 'slider-thumb-label') {
			e.stopPropagation();
		}
	}}
	onpointermove={(e) => {
		if (!e.target) return;
		const slotName = (e.target as HTMLElement).dataset['slot'];
		if (slotName === 'slider-thumb' || slotName === 'slider-thumb-label') {
			e.currentTarget.style.setProperty('--after-content', '');
			e.currentTarget.style.setProperty('--after-left', `0%`);
			e.currentTarget.style.setProperty('--after-display', 'hidden');
			return;
		}
		const [time, left] = getPointDuration(e);
		if (left) {
			e.currentTarget.style.setProperty('--after-content', `'${format(time)}'`);
			e.currentTarget.style.setProperty('--after-left', `${left}%`);
			e.currentTarget.style.setProperty('--after-display', 'inline');
		}
	}}
	onpointerup={(e) => {
		handlePointDuration(e);
	}}
	onpointerleave={(e) => {
		e.currentTarget.style.setProperty('--after-content', '');
		e.currentTarget.style.setProperty('--after-left', `0%`);
		e.currentTarget.style.setProperty('--after-display', 'hidden');
		// handlePointDuration(e);
	}}
>
	{#snippet children({ thumbs })}
		<span
			data-orientation={orientation}
			data-slot="slider-track"
			class={cn(
				'relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5'
			)}
		>
			<SliderPrimitive.Range
				data-slot="slider-range"
				class={cn(
					'absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full'
				)}
			/>
		</span>

		{#if tickLabel != undefined && restProps.max}
			<div
				data-slot="slider-player"
				class="absolute z-4 size-2 -translate-x-1/2 rounded-full border border-primary-foreground bg-destructive"
				style={`left: ${tickLeftLength}%`}
			></div>
		{/if}
		{#each thumbs as thumb (thumb)}
			<SliderPrimitive.Thumb
				data-slot="slider-thumb"
				index={thumb}
				class="block size-3.5 shrink-0 rounded-full border border-primary bg-background shadow-sm ring-ring/50 transition-[color,box-shadow] hover:z-6 hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
			>
				{#if Array.isArray(value)}
					<div
						data-thumb-order={thumb}
						data-slot="slider-thumb-label"
						class="absolute top-4 left-0 w-fit -translate-x-1/3 rounded bg-background/80 px-1.5 py-0.5 text-xs font-medium text-white transition-all duration-100 ease-linear"
					>
						{format ? format(value[thumb]) : value[thumb]}
					</div>
				{/if}
			</SliderPrimitive.Thumb>
		{/each}
	{/snippet}
</SliderPrimitive.Root>

<style>
	:global(.yt-slider::after) {
		position: absolute;
		top: 0;
		content: var(--after-content, '');
		left: var(--after-left, '0');
		margin: 0 8px;
		z-index: 1000;
		overflow: hidden;
		translate: -50%;
		display: var(--after-display, 'hidden');
	}
	:global(-yt-slider) {
		overflow: hidden;
	}
</style>
