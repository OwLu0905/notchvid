import { keymap } from 'prosemirror-keymap';
import type { Command } from 'prosemirror-state';

interface KeyMapConfig {
	[key: string]: Command;
}

interface CustomKeyMapOptions {
	onPlayPause?: () => void;
	onSeekBack?: () => void;
	onSeekForward?: () => void;
}

export function createCustomKeyMapPlugin(options: CustomKeyMapOptions) {
	const customKeyMap: KeyMapConfig = {};

	if (options.onPlayPause) {
		customKeyMap['Alt-k'] = () => {
			options.onPlayPause?.();
			return true;
		};
	}

	if (options.onSeekBack) {
		customKeyMap['Alt-j'] = () => {
			options.onSeekBack?.();
			return true;
		};
	}

	if (options.onSeekForward) {
		customKeyMap['Alt-l'] = () => {
			options.onSeekForward?.();
			return true;
		};
	}

	return keymap(customKeyMap);
}
