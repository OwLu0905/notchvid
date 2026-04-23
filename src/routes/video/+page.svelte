<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { superForm, defaults } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { z } from 'zod';
	import * as Form from '$lib/components/ui/form/index.js';
	import { getYtOembed } from '$lib/services/yt-service';
	import { slide } from 'svelte/transition';
	import Loader from '$lib/components/Loader.svelte';
	import { goto } from '$app/navigation';
	import { createVideoSession } from '$lib/remote/video.remote';
	import { getClientTz } from '$lib/utils/tz';

	const ytDlpSchema = z.object({
		url: z.url()
	});

	let htmlIframe = $state('');
	let url = $state('');
	let title = $state('');
	let thumbnailUrl = $state('');
	let isLoading = $state(false);

	let step = $state(1);
	function reset() {
		htmlIframe = '';
		url = '';
		title = '';
		thumbnailUrl = '';
		isLoading = false;
		step = 1;
	}
	const form = superForm(defaults(zod4(ytDlpSchema)), {
		validators: zod4(ytDlpSchema),
		SPA: true,
		async onUpdate({ form: updatedForm, cancel }) {
			try {
				if (step == 2) {
					isLoading = true;
					const vidioId = await createVideoSession({ title, url, thumbnailUrl, tz: getClientTz() });
					reset();
					goto(`/video/${vidioId}`);
				} else {
					cancel();
				}

				// TODO: add shorts
				// check v=?
				const result = await form.validateForm({ update: true });
				const checkUrl = new URL(result.data.url);
				const vTag = checkUrl.searchParams.get('v');

				if (!vTag) {
					form.errors.set({ url: ['Failed to fetch video information.'] });
				}
				if (result.valid && vTag) {
					const videoResult = await getYtOembed(result.data.url);

					if (!videoResult) {
						form.errors.set({ url: ['Failed to fetch video information.'] });
					} else {
						url = vTag;
						title = videoResult!.title;
						htmlIframe = videoResult!.html;
						thumbnailUrl = videoResult!.thumbnail_url;
						step += 1;
					}
				}
			} catch (error) {
				console.error(error);
			}
		}
	});

	const { form: formData, enhance } = form;
</script>

<div class="mx-auto w-full max-w-lg pt-10">
	<Card.Root>
		<Card.Header>
			<Card.Title>Video</Card.Title>
		</Card.Header>

		{#if htmlIframe !== ''}
			<div class="*:aspect-video *:h-auto *:w-full *:rounded-2xl *:p-2" transition:slide>
				{@html htmlIframe}
			</div>
		{/if}

		<Card.Content>
			<form method="POST" use:enhance>
				<Form.Field {form} name="url">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>
								Link
								<span class="font-normal text-muted-foreground">(videos, <del>shorts</del>)</span>
							</Form.Label>
							<InputGroup.Root>
								<InputGroup.Input
									disabled={htmlIframe !== ''}
									readonly={htmlIframe !== ''}
									placeholder="https://www.youtube.com/watch?v="
									bind:value={$formData.url}
									{...props}
								/>
								<InputGroup.Addon>
									<SearchIcon />
								</InputGroup.Addon>
							</InputGroup.Root>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />

					<div class="mt-6 flex justify-end gap-2">
						{#if htmlIframe === ''}
							<Form.Button>Check</Form.Button>
						{:else}
							<Button
								type="button"
								variant="outline"
								disabled={isLoading}
								onclick={() => {
									reset();
								}}
								>Cancel
							</Button>
							<Form.Button disabled={isLoading}>
								{#if isLoading}
									<Loader />
								{/if}
								Submit
							</Form.Button>
						{/if}
					</div>
				</Form.Field>
			</form>
		</Card.Content>
	</Card.Root>
</div>
