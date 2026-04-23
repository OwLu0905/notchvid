import { schema as markdownSchema } from 'prosemirror-markdown';
import { Schema, type MarkSpec, type NodeSpec } from 'prosemirror-model';

const myMarkSpec: MarkSpec = {
	attrs: { color: { default: 'red' } },
	parseDOM: [
		{
			tag: 'span[data-highlight]',
			getAttrs: (dom) => {
				if (typeof dom === 'string') return {};
				return { color: dom.getAttribute('data-color') || 'red' };
			}
		}
	],
	toDOM(mark) {
		return [
			'span',
			{
				'data-highlight': 'true',
				'data-color': mark.attrs.color,
				style: `background-color: ${mark.attrs.color}`
			},
			0
		];
	}
};

const strikethroughSpec: MarkSpec = {
	parseDOM: [{ tag: 'span[data-strikethrough]' }],
	toDOM() {
		return [
			'span',
			{ 'data-strikethrough': 'true', style: 'text-decoration: line-through' },
			0
		];
	}
};

const timeBlockSpec: NodeSpec = {
	group: 'inline',
	inline: true,
	atom: true,
	attrs: {
		time: { default: '' },
		variant: { default: 'time' }
	},
	toDOM(node) {
		const variant = node.attrs.variant || 'time';
		return [
			'span',
			{
				class: `time-block time-block-${variant}`,
				'data-time': node.attrs.time,
				'data-variant': variant
			},
			`${node.attrs.time}`
		];
	},
	parseDOM: [
		{
			tag: 'span.time-block',
			getAttrs(dom) {
				if (typeof dom === 'string') return {};
				return {
					time: dom.getAttribute('data-time') || '',
					variant: dom.getAttribute('data-variant') || 'time'
				};
			}
		}
	]
};

type ExtractNodes<S> = S extends Schema<infer N, any> ? N : never;
type ExtractMarks<S> = S extends Schema<any, infer M> ? M : never;
type MarkdownNodes = ExtractNodes<typeof markdownSchema>;
type MarkdownMarks = ExtractMarks<typeof markdownSchema>;

type CustomMarks = 'highlight' | 'strikethrough';
type CustomNodes = 'timeBlock';

export const editorSchema = new Schema<MarkdownNodes | CustomNodes, MarkdownMarks | CustomMarks>({
	nodes: markdownSchema.spec.nodes.addToEnd('timeBlock', timeBlockSpec),
	marks: markdownSchema.spec.marks
		.addToEnd('highlight', myMarkSpec)
		.addToEnd('strikethrough', strikethroughSpec)
});
