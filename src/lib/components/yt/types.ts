export interface YouTubePlayerContext {
	getPlayer: () => YT.Player | null;
	getReady: () => boolean;
	getError: () => string | null;
}

export interface YouTubeSliderContext {
	getSliderValues: () => [number, number];
}

export type TSLIDER_VALUES = [left: number, right: number];
