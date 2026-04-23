<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end';
	import PlusIcon from '@lucide/svelte/icons/plus';
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 pt-24 text-center">
	<div
		class="flex aspect-square size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground"
	>
		<GalleryVerticalEndIcon class="size-7" />
	</div>

	<div class="flex flex-col gap-3">
		<h1 class="text-4xl font-semibold tracking-tight">Welcome to Notchvid</h1>
		<p class="text-balance text-muted-foreground">
			Paste a YouTube link, watch it alongside your notes, and build a searchable library of
			timestamped takeaways.
		</p>
	</div>

	<Button href="/video" size="lg">
		<PlusIcon />
		New Video
	</Button>
</div>
