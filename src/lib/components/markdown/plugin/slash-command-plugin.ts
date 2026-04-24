import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Fragment } from 'prosemirror-model';
import { formatSecondsToMMSS } from '$lib/utils';

export const slashCommandKey = new PluginKey('slashCommand');

interface SlashCommandState {
	active: boolean;
	range: { from: number; to: number } | null;
	query: string;
	selectedIndex: number;
}

const INACTIVE_STATE: SlashCommandState = {
	active: false,
	range: null,
	query: '',
	selectedIndex: 0
};

export interface Command {
	name: string;
	description: string;
}

export type TimeBlockVariant = 'time' | 'unclear' | 'shadow';

const commands: Command[] = [
	{ name: 'time', description: 'Insert current timestamp' },
	{ name: 'unclear', description: 'Mark an unclear sentence or vocabulary' },
	{ name: 'shadow', description: 'Mark a sentence worth shadowing' }
];

const TIME_BLOCK_COMMANDS = new Set<string>(['time', 'unclear', 'shadow']);

function filterCommands(query: string): Command[] {
	const q = query.toLowerCase();
	return commands.filter((cmd) => cmd.name.toLowerCase().startsWith(q));
}

interface SlashCommandOptions {
	onShowMenu?: (
		coords: { left: number; cursorTop: number; cursorBottom: number },
		filteredCommands: Command[],
		selectedIndex: number
	) => void;
	onHideMenu?: () => void;
	onUpdateSelection?: (selectedIndex: number) => void;
	onExecute?: (commandName: string) => void;
	getTime?: () => number; // Add this to get current time from parent
	onTimeBlockClick?: (time: string) => void; // Add this
}

function executeCommand(
	view: EditorView,
	commandName: string,
	range: { from: number; to: number },
	options?: SlashCommandOptions
) {
	const { state } = view;
	const { schema } = state;
	let tr = state.tr.delete(range.from, range.to);

	if (TIME_BLOCK_COMMANDS.has(commandName)) {
		const timeValue = options?.getTime?.() ?? 0;
		const formattedTime = formatSecondsToMMSS(timeValue);
		const timeNode = schema.nodes.timeBlock.create({
			time: formattedTime,
			variant: commandName
		});
		const spaceNode = schema.text(' ');
		const fragment = Fragment.from([timeNode, spaceNode]);
		tr = tr.replaceWith(range.from, range.from, fragment);
	}

	tr = tr.setMeta(slashCommandKey, INACTIVE_STATE);
	view.dispatch(tr);
	view.focus();
}

export function slashCommandPlugin(options?: SlashCommandOptions) {
	return new Plugin<SlashCommandState>({
		key: slashCommandKey,

		state: {
			init() {
				return INACTIVE_STATE;
			},
			apply(tr, pluginState) {
				const meta = tr.getMeta(slashCommandKey);
				if (meta) return meta;

				if (!tr.docChanged && !tr.selectionSet) return pluginState;

				const { $from: _from } = tr.selection;
				// textBetween (with empty leafText) skips atom inline nodes like timeBlock
				// so the slice lines up with actual text before the cursor.
				const textBefore = _from.parent.textBetween(0, _from.parentOffset, '', '');
				const match = textBefore.match(/\/(\w*)$/);

				if (match) {
					const from = _from.pos - match[0].length;
					const to = _from.pos;
					const query = match[1];
					// Preserve selectedIndex only if the query is unchanged; reset on any
					// query edit so the user always sees the first match highlighted.
					const selectedIndex =
						pluginState.active && pluginState.query === query ? pluginState.selectedIndex : 0;
					return {
						active: true,
						range: { from, to },
						query,
						selectedIndex
					};
				}

				return INACTIVE_STATE;
			}
		},

		view(editorView) {
			return {
				update(view, prevState) {
					const state = slashCommandKey.getState(view.state);
					const prevSlashState = slashCommandKey.getState(prevState);

					const wasActive = !!(prevSlashState?.active && prevSlashState.range);
					const isActive = !!(state?.active && state.range);

					if (isActive) {
						const positionChanged =
							!wasActive ||
							prevSlashState!.range!.from !== state!.range!.from ||
							prevSlashState!.query !== state!.query;

						if (positionChanged) {
							const coords = view.coordsAtPos(state!.range!.from);
							const filtered = filterCommands(state!.query);
							options?.onShowMenu?.(
								{ left: coords.left, cursorTop: coords.top, cursorBottom: coords.bottom },
								filtered,
								state!.selectedIndex
							);
						} else if (prevSlashState!.selectedIndex !== state!.selectedIndex) {
							options?.onUpdateSelection?.(state!.selectedIndex);
						}
					} else if (wasActive) {
						options?.onHideMenu?.();
					}
				}
			};
		},

		props: {
			handleTextInput(view, from, to, text) {
				const state = slashCommandKey.getState(view.state);

				if (text === ' ' && state?.active && state.range) {
					const query = state.query.toLowerCase();
					const command = commands.find((cmd) => cmd.name.toLowerCase() === query);

					if (command) {
						executeCommand(view, command.name, state.range, options);
						options?.onExecute?.(command.name);
						return true;
					}
				}

				return false;
			},

			handleKeyDown(view, event) {
				const state = slashCommandKey.getState(view.state);

				if (state?.active) {
					if (event.key === 'Escape') {
						view.dispatch(view.state.tr.setMeta(slashCommandKey, INACTIVE_STATE));
						options?.onHideMenu?.();
						return true;
					}

					if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && state.range) {
						const filtered = filterCommands(state.query);
						if (filtered.length === 0) return false;
						event.preventDefault();
						const delta = event.key === 'ArrowDown' ? 1 : -1;
						const newIndex =
							(state.selectedIndex + delta + filtered.length) % filtered.length;
						view.dispatch(
							view.state.tr.setMeta(slashCommandKey, {
								...state,
								selectedIndex: newIndex
							})
						);
						return true;
					}

					if (event.key === 'Tab' && state.range) {
						const filtered = filterCommands(state.query);
						if (filtered.length > 0) {
							event.preventDefault();
							const idx = Math.min(state.selectedIndex, filtered.length - 1);
							executeCommand(view, filtered[idx].name, state.range, options);
							options?.onExecute?.(filtered[idx].name);
							return true;
						}
					}
				}

				return false;
			},
			handleClickOn(view, pos, node, nodePos, event, direct) {
				// Check if the clicked node is a timeBlock
				if (node.type.name === 'timeBlock') {
					const time = node.attrs.time;
					options?.onTimeBlockClick?.(time);
					return true; // Prevent default behavior
				}
				return false;
			}
		}
	});
}
