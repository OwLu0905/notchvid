import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap } from 'prosemirror-commands';
import { Plugin } from 'prosemirror-state';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { menuBar, type MenuElement } from 'prosemirror-menu';
import { Schema } from 'prosemirror-model';
import 'prosemirror-menu/style/menu.css';

import { buildMenuItems } from './menu';
import { buildKeymap } from './keymap';
import { buildInputRules } from './inputrules';

export function exampleSetup(options: {
	/// The schema to generate key bindings and menu items for.
	schema: Schema;

	/// Can be used to [adjust](#example-setup.buildKeymap) the key bindings created.
	mapKeys?: { [key: string]: string | false };

	/// Set to false to disable the menu bar.
	menuBar?: boolean;

	/// Set to false to disable the history plugin.
	history?: boolean;

	/// Set to false to make the menu bar non-floating.
	floatingMenu?: boolean;

	/// Can be used to override the menu content.
	menuContent?: MenuElement[][];
}) {
	let plugins = [
		buildInputRules(options.schema),
		keymap(buildKeymap(options.schema, options.mapKeys)),
		keymap(baseKeymap),
		dropCursor(),
		gapCursor()
	];
	if (options.menuBar !== false)
		plugins.push(
			menuBar({
				// floating: options.floatingMenu !== false,
				floating: true,
				content: options.menuContent || buildMenuItems(options.schema).fullMenu
			})
		);
	if (options.history !== false) plugins.push(history());

	return plugins.concat(
		new Plugin({
			props: {
				attributes: { class: 'ProseMirror-example-setup-style' }
			}
		})
	);
}
