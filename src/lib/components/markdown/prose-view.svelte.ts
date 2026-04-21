import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { EditorState, Plugin } from 'prosemirror-state';

import { exampleSetup } from './basic/exampleSetup';

import { toggleMark } from 'prosemirror-commands';
import { Fragment, Node, type Attrs, type MarkType } from 'prosemirror-model';
import { editorSchema } from './schema';
import { slashCommandKey } from './plugin/slash-command-plugin';
import { createCustomKeyMapPlugin } from './plugin/yt-keymap-plugin';
import { DOMParser } from 'prosemirror-model';
import { formatSecondsToMMSS } from '$lib/utils';

type ProseViewOptions = {
	onUpdate: (data: unknown) => void;
	onCtrlP: () => void;
	onCtrlN: () => void;
	onCtrlM: () => void;
	editable?: boolean;
};

const emptyParagraphPlugin = new Plugin({
	props: {
		decorations(state) {
			const decorations: Decoration[] = [];

			// NOTE: custom placeholder when content is fully empty
			if (
				state.doc.children.length === 1 &&
				state.doc.textContent === '' &&
				state.doc.children[0].type === editorSchema.nodes.paragraph
			) {
				state.doc.descendants((node, pos, parent, index) => {
					if (parent?.type.name === 'doc' && node.childCount === 0) {
						decorations.push(
							Decoration.node(pos, pos + node.nodeSize, {
								class: 'empty-content',
								'data-placeholder': 'Focusing... 🔥'
							})
						);
					}
				});
			}

			return DecorationSet.create(state.doc, decorations);
		}
	}
});

function createInitialContent(schema: typeof editorSchema, contents?: string) {
	const p = document.createElement('p');
	p.textContent = contents ?? '';
	return DOMParser.fromSchema(schema).parse(p);
}

export class ProseView {
	view: EditorView | null = $state.raw(null);
	state: EditorState | null = $state.raw(null);
	schema = editorSchema;
	#onUpdate?: (data: unknown) => void;
	#onCtrlP?: () => void;
	#onCtrlN?: () => void;
	#onCtrlM?: () => void;

	constructor(
		target: HTMLDivElement,
		content: Object | string,
		options?: Partial<ProseViewOptions>
	) {
		this.#onUpdate = options?.onUpdate;
		this.#onCtrlP = options?.onCtrlP;
		this.#onCtrlN = options?.onCtrlN;
		this.#onCtrlM = options?.onCtrlM;

		let doc;

		if (typeof content === 'object') {
			doc = Node.fromJSON(editorSchema, content);
		} else {
			doc = createInitialContent(this.schema, content);
		}

		this.state = EditorState.create({
			doc: doc,
			plugins: [
				...exampleSetup({ schema: editorSchema, menuBar: false }),
				emptyParagraphPlugin,
				createCustomKeyMapPlugin({
					onCtrlP: () => this.#onCtrlP?.(),
					onCtrlN: () => this.#onCtrlN?.(),
					onCtrlM: () => this.#onCtrlM?.()
				})
			]
		});

		const view = new EditorView(
			{ mount: target },
			{
				editable() {
					return options?.editable ?? true;
				},
				state: this.state,
				dispatchTransaction: (tr) => {
					const newState = view.state.apply(tr);
					view.updateState(newState);
					this.state = newState;

					if (tr.docChanged) {
						this.#onUpdate?.(view.state.doc.toJSON());
					}
				}
			}
		);

		this.view = view;
	}

	setHandlers(handlers: Partial<ProseViewOptions>) {
		if ('onUpdate' in handlers) this.#onUpdate = handlers.onUpdate;
		if ('onCtrlP' in handlers) this.#onCtrlP = handlers.onCtrlP;
		if ('onCtrlN' in handlers) this.#onCtrlN = handlers.onCtrlN;
		if ('onCtrlM' in handlers) this.#onCtrlM = handlers.onCtrlM;
	}

	registerPlugin(plugin: Plugin) {
		if (!this.view) return;

		const newState = this.view.state.reconfigure({
			plugins: [...this.view.state.plugins, plugin]
		});
		this.view.updateState(newState);
	}

	unregisterPlugin(plugin: Plugin) {
		if (!this.view) return;

		const newState = this.view.state.reconfigure({
			plugins: this.view.state.plugins.filter((p) => p !== plugin)
		});
		this.view.updateState(newState);
	}

	isActive(type: MarkType) {
		// NOTE: keep reactivity
		this.state;

		if (!this.view) return false;

		let { from, $from: _from, to, empty } = this.view.state.selection;

		if (empty) {
			return !!type.isInSet(this.view.state.storedMarks || _from.marks());
		} else {
			return this.view.state.doc.rangeHasMark(from, to, type);
		}
	}

	onMarkBackground(type: MarkType, attrs?: Attrs | null) {
		const tm = toggleMark(type, attrs);
		tm(this.view!.state, this.view!.dispatch, this.view!);
	}

	insertTimeBlock(time: number) {
		const state = slashCommandKey.getState(this.view!.state);

		const formattedTime = formatSecondsToMMSS(time);

		// Delete the slash command text first
		const { from, to } = state.range;
		let tr = this.view!.state.tr.delete(from, to);

		// Then insert the timeBlock and space
		const timeNode = this.schema.nodes.timeBlock.create({ time: formattedTime });
		const spaceNode = this.schema.text(' ');
		const fragment = Fragment.from([timeNode, spaceNode]);
		tr = tr.replaceWith(from, from, fragment);

		// Clear the slash command state
		tr = tr.setMeta(slashCommandKey, { active: false, range: null, query: '' });

		this.view!.dispatch(tr);
		this.view!.focus();
	}

	getContentJSON() {
		if (!this.view) return null;
		return this.view.state.doc.toJSON();
	}

	destroy() {
		this.view?.destroy();
	}
}
