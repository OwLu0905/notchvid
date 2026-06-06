<script lang="ts">
	import LoginForm from './login-form.svelte';
	import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import SearchIcon from '@lucide/svelte/icons/search';
	import NotebookPenIcon from '@lucide/svelte/icons/notebook-pen';

	const features = [
		{
			icon: ClockIcon,
			title: 'Timestamped notes',
			description: 'Capture insights at the exact second they happen.'
		},
		{
			icon: NotebookPenIcon,
			title: 'Watch and write, side by side',
			description: 'Keep the video and your notes in view, always in sync.'
		},
		{
			icon: SearchIcon,
			title: 'A searchable library',
			description: 'Find any takeaway across every video you have saved.'
		}
	];
</script>

<svelte:head>
	<title>Sign in · Notchvid</title>
</svelte:head>

<div class="grid min-h-svh w-full lg:grid-cols-2">
	<!-- Brand / value-prop panel -->
	<aside
		class="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex"
	>
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 opacity-[0.07]"
			style="background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0); background-size: 24px 24px;"
		></div>

		<a href="/" class="relative z-10 flex items-center gap-2 font-medium">
			<div
				class="flex size-7 items-center justify-center rounded-md bg-primary-foreground text-primary"
			>
				<GalleryVerticalEndIcon class="size-4" />
			</div>
			<span class="text-lg">notchvid</span>
		</a>

		<div class="relative z-10 flex flex-col gap-10">
			<div class="flex flex-col gap-4">
				<h2 class="text-balance text-3xl font-semibold tracking-tight">
					Turn every video into a library of takeaways you can actually find later.
				</h2>
				<p class="text-balance text-sm text-primary-foreground/70">
					Paste a YouTube link, watch alongside your notes, and build a searchable record of
					what mattered.
				</p>
			</div>

			<ul class="flex flex-col gap-5">
				{#each features as feature (feature.title)}
					{@const Icon = feature.icon}
					<li class="flex items-start gap-3">
						<div
							class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10"
						>
							<Icon class="size-4" />
						</div>
						<div class="flex flex-col gap-0.5">
							<p class="text-sm font-medium">{feature.title}</p>
							<p class="text-sm text-primary-foreground/70">{feature.description}</p>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<p class="relative z-10 text-xs text-primary-foreground/60">
			&copy; {new Date().getFullYear()} Notchvid
		</p>
	</aside>

	<!-- Form panel -->
	<main class="flex flex-col p-6 md:p-10">
		<div class="flex items-center justify-between lg:hidden">
			<a href="/" class="flex items-center gap-2 font-medium">
				<div
					class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
				>
					<GalleryVerticalEndIcon class="size-4" />
				</div>
				notchvid
			</a>
		</div>

		<div class="flex flex-1 items-center justify-center">
			<div class="w-full max-w-sm">
				<LoginForm />
			</div>
		</div>
	</main>
</div>
