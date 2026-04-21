import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Fragment } from 'prosemirror-model';
import { formatSecondsToMMSS } from '$lib/utils';

export const slashCommandKey = new PluginKey('slashCommand');

interface SlashCommandState {
	active: boolean;
	range: { from: number; to: number } | null;
	query: string;
}

export interface Command {
	name: string;
	description: string;
}

const commands: Command[] = [{ name: 'time', description: 'Insert current time' }];

interface SlashCommandOptions {
	onShowMenu?: (coords: { left: number; top: number }, filteredCommands: Command[]) => void;
	onHideMenu?: () => void;
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

	switch (commandName) {
		case 'time': {
			const timeValue = options?.getTime?.() ?? 0;
			const formattedTime = formatSecondsToMMSS(timeValue);
			const timeNode = schema.nodes.timeBlock.create({ time: formattedTime });
			const spaceNode = schema.text(' ');
			const fragment = Fragment.from([timeNode, spaceNode]);
			tr = tr.replaceWith(range.from, range.from, fragment);
			break;
		}
	}

	tr = tr.setMeta(slashCommandKey, { active: false, range: null, query: '' });
	view.dispatch(tr);
	view.focus();
}

export function slashCommandPlugin(options?: SlashCommandOptions) {
	return new Plugin<SlashCommandState>({
		key: slashCommandKey,

		state: {
			init() {
				return { active: false, range: null, query: '' };
			},
			apply(tr, pluginState) {
				const meta = tr.getMeta(slashCommandKey);
				if (meta) return meta;

				if (!tr.docChanged && !tr.selectionSet) return pluginState;

				const { $from: _from } = tr.selection;
				const textBefore = _from.parent.textContent.slice(0, _from.parentOffset);
				const match = textBefore.match(/\/(\w*)$/);

				if (match) {
					const from = _from.pos - match[0].length;
					const to = _from.pos;
					return {
						active: true,
						range: { from, to },
						query: match[1]
					};
				}

				return { active: false, range: null, query: '' };
			}
		},

		view(editorView) {
			return {
				update(view, prevState) {
					const state = slashCommandKey.getState(view.state);
					const prevSlashState = slashCommandKey.getState(prevState);

					if (state?.active && state.range) {
						const coords = view.coordsAtPos(state.range.from);
						const filtered = commands.filter((cmd) =>
							cmd.name.toLowerCase().startsWith(state.query.toLowerCase())
						);
						options?.onShowMenu?.({ left: coords.left, top: coords.bottom + 5 }, filtered);
					} else if (prevSlashState?.active && !state?.active) {
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
						view.dispatch(
							view.state.tr.setMeta(slashCommandKey, {
								active: false,
								range: null,
								query: ''
							})
						);
						options?.onHideMenu?.();
						return true;
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
