import { Plugin, PluginKey, Selection } from 'prosemirror-state';
import { clampToViewport } from '../utils';

const bubbleMenuKey = new PluginKey('bubbleMenu');
type BubbleMenuPluginProps = {
	element: HTMLElement;
	delayDuration: number;
	openState: (v: boolean) => void;
};

export function bubbleMenuPlugin(props: BubbleMenuPluginProps) {
	const { element, delayDuration, openState } = props;
	let showTimeout: ReturnType<typeof setTimeout> | null = null;
	let isVisible = false;
	element.style.visibility = 'hidden';
	element.style.zIndex = '50';

	function showMenu({ top, left }: { top: number; left: number }) {
		// Set initial position and make visible (but transparent initially for measurement)
		element.style.opacity = '0';
		element.style.visibility = 'visible';
		element.style.top = `${top}px`;
		element.style.left = `${left}px`;

		openState(true);
		isVisible = true;

		// Wait for next frame to measure actual dimensions and adjust position
		requestAnimationFrame(() => {
			const { left: adjustedLeft, top: adjustedTop } = clampToViewport(
				{ left, top },
				{ width: element.offsetWidth, height: element.offsetHeight }
			);
			element.style.top = `${adjustedTop}px`;
			element.style.left = `${adjustedLeft}px`;
			element.style.opacity = '1';
		});
	}
	function resetMenu() {
		if (showTimeout) {
			clearTimeout(showTimeout);
			showTimeout = null;
		}
		element.style.opacity = '0';
		element.style.visibility = 'hidden';

		openState(false);
		isVisible = false;
	}
	function scheduleShow(coords: { top: number; left: number }) {
		if (showTimeout) clearTimeout(showTimeout);
		showTimeout = setTimeout(() => showMenu(coords), delayDuration);
	}

	return new Plugin({
		key: bubbleMenuKey,
		view: (editorView) => {
			const updatePosition = () => {
				const { from, to } = editorView.state.selection;
				if (from !== to) {
					const start = editorView.coordsAtPos(from);
					const end = editorView.coordsAtPos(to);

					showMenu({
						top: start.top - 50,
						left: (start.left + end.right) / 2
					});
				}
			};
			// Event handlers
			const onResize = () => {
				if (isVisible) updatePosition();
			};

			const onScroll = () => {
				// TODO: debounce or remove the update until the end action to show
				if (isVisible) updatePosition();
			};

			const onMouseDown = (e: MouseEvent) => {
				const target = e.target as Node;

				// NOTE: prevent selection be dismissed when click the bubble menu area (like margin area)
				if (element.contains(target)) {
					e.preventDefault();
					return;
				}

				// NOTE: when click p margin area, the selection will stay
				if (e.target === element || !editorView.dom.contains(e.target as Node)) {
					editorView.focus();
					const tr = editorView.state.tr.setSelection(Selection.atEnd(editorView.state.doc));
					editorView.dispatch(tr);
				}

				if (!editorView.dom.contains(target) && !element.contains(target)) {
					resetMenu();
				}
			};

			// Subscribe
			window.addEventListener('resize', onResize);
			window.addEventListener('scroll', onScroll, true);
			document.addEventListener('mousedown', onMouseDown);

			return {
				update(view, prevState) {
					const { from, to } = view.state.selection;

					const text = view.state.doc.textBetween(from, to);

					// NOTE: two line => when double click the end of one line, the bubble menu will show but there is no selection, console.log(text, from, to) will show ('',197 199)
					if (text === '' && from !== to) {
						return;
					}
					// Only update if selection changed
					if (prevState.selection.eq(view.state.selection)) {
						return;
					}

					if (from === to) {
						resetMenu();
						return;
					}
					const start = view.coordsAtPos(from);
					const end = view.coordsAtPos(to);

					const coords = {
						top: start.top - 50,
						left: (start.left + end.right) / 2
					};
					// Use delay for initial show
					if (!isVisible) {
						scheduleShow(coords);
					} else {
						showMenu(coords);
					}
				},
				destroy() {
					if (showTimeout) clearTimeout(showTimeout);
					window.removeEventListener('resize', onResize);
					window.removeEventListener('scroll', onScroll, true);
					document.removeEventListener('mousedown', onMouseDown);
					resetMenu();
				}
			};
		}
	});
}
