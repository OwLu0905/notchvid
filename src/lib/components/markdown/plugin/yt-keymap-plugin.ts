import { keymap } from 'prosemirror-keymap';
import type { Command } from 'prosemirror-state';

interface KeyMapConfig {
	[key: string]: Command;
}

interface CustomKeyMapOptions {
	onCtrlP?: () => void;
	onCtrlN?: () => void;
	onCtrlM?: () => void;
}

export function createCustomKeyMapPlugin(options: CustomKeyMapOptions) {
	const customKeyMap: KeyMapConfig = {};

	if (options.onCtrlP) {
		customKeyMap['Ctrl-p'] = () => {
			options.onCtrlP?.();
			return true;
		};
	}

	if (options.onCtrlN) {
		customKeyMap['Ctrl-n'] = () => {
			options.onCtrlN?.();
			return true;
		};
	}

	if (options.onCtrlM) {
		customKeyMap['Ctrl-m'] = () => {
			options.onCtrlM?.();
			return true;
		};
	}

	return keymap(customKeyMap);
}
