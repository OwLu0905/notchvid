export interface YouTubePlayerContext {
	getPlayer: () => any;
	getReady: () => boolean;
	getError: () => string | null;
}

export interface YouTubeSliderContext {
	getSliderValues: () => [number, number];
}