import { Plugin } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import type { Command } from 'prosemirror-state';

interface KeyMapConfig {
	[key: string]: Command;
}

interface CustomKeyMapOptions {
	onCtrlP?: () => void;
	onCtrlN?: () => void;
	onCtrlM?: () => void;
	// Add more custom handlers as needed
}

export function createCustomKeyMapPlugin(options: CustomKeyMapOptions) {
	const customKeyMap: KeyMapConfig = {};

	if (options.onCtrlP) {
		customKeyMap['ctrl-p'] = (state, dispatch) => {
			options.onCtrlP?.();
			return true; // Prevent default behavior
		};
	}

	if (options.onCtrlN) {
		customKeyMap['ctrl-n'] = (state, dispatch) => {
			options.onCtrlN?.();
			return true;
		};
	}

	if (options.onCtrlM) {
		customKeyMap['ctrl-m'] = (state, dispatch) => {
			options.onCtrlM?.();
			return true;
		};
	}

	return keymap(customKeyMap);
}
