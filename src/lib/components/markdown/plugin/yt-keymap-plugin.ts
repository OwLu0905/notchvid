import { keymap } from 'prosemirror-keymap';
import { TextSelection, type Command } from 'prosemirror-state';

interface KeyMapConfig {
	[key: string]: Command;
}

interface CustomKeyMapOptions {
	onPlayPause?: () => void;
	onSeekBack?: () => void;
	onSeekForward?: () => void;
}

// When the cursor sits right after an "[inline atom][space]" pair (the shape
// produced on timeBlock insertion), collapse Backspace into a single-press
// delete of both nodes. Without this, the user pays two presses: one for the
// space, one for the atom. All other Backspace cases fall through to default.
const deleteAtomBackward: Command = (state, dispatch) => {
	const { selection } = state;
	if (!(selection instanceof TextSelection) || !selection.empty) return false;

	const $cursor = selection.$cursor;
	if (!$cursor || $cursor.pos < 2) return false;

	const charBefore = state.doc.textBetween($cursor.pos - 1, $cursor.pos);
	if (charBefore !== ' ') return false;

	const $beforeSpace = state.doc.resolve($cursor.pos - 1);
	const atom = $beforeSpace.nodeBefore;
	// `isAtom` is true for any leaf (including text cuts) whose spec doesn't
	// set `atom: false`, so we additionally require `spec.atom === true` —
	// that only matches explicit atoms like timeBlock.
	if (!atom || !atom.isInline || atom.type.spec.atom !== true) return false;

	if (dispatch) {
		dispatch(state.tr.delete($cursor.pos - 1 - atom.nodeSize, $cursor.pos));
	}
	return true;
};

export function createCustomKeyMapPlugin(options: CustomKeyMapOptions) {
	const customKeyMap: KeyMapConfig = {
		Backspace: deleteAtomBackward
	};

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
