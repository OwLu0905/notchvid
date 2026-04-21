export const ENDPOINTS = {
	ytEmbed: 'https://www.youtube.com/oembed?format=json&url='
};

export interface YoutubeOEmbedResponse {
	type: 'video';
	version: '1.0';
	title: string;
	author_name: string;
	author_url: string;
	provider_name: 'YouTube';
	provider_url: 'https://www.youtube.com/';
	thumbnail_url: string;
	thumbnail_width: number;
	thumbnail_height: number;
	html: string;
	width: number;
	height: number;
}

export async function getYtOembed(
	youtube_video_url: string
): Promise<YoutubeOEmbedResponse | undefined> {
	const oembed_url = `${ENDPOINTS.ytEmbed}${youtube_video_url}`;

	try {
		const result = await fetch(oembed_url, {
			method: 'get'
		});
		if (!result.ok) throw new Error('fetch failed');
		const data = (await result.json()) as YoutubeOEmbedResponse;

		return data;
	} catch (error) {
		console.error('Error checking video:', error);
	}
}
