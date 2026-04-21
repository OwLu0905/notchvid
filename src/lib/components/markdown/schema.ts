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
	attrs: { 'text-decoration': { default: 'line-through' } },
	parseDOM: [
		{
			tag: 'span[data-strikethrough]',
			getAttrs: (dom) => {
				if (typeof dom === 'string') return {};
				return { 'text-decoration': dom.getAttribute('data-text-decoration') || 'none' };
			}
		}
	],
	toDOM(mark) {
		return [
			'span',
			{
				'data-strikethrough': 'true',
				'data-text-decoration': mark.attrs['text-decoration'],
				style: `text-decoration: ${mark.attrs['text-decoration']}`
			},
			0
		];
	}
};

const timeBlockSpec: NodeSpec = {
	group: 'inline',
	inline: true,
	atom: true,
	attrs: {
		time: { default: '' }
	},
	toDOM(node) {
		return [
			'span',
			{
				class: 'time-block',
				'data-time': node.attrs.time
			},
			`${node.attrs.time}`
		];
	},
	parseDOM: [
		{
			tag: 'span.time-block',
			getAttrs(dom) {
				if (typeof dom === 'string') return {};
				return { time: dom.getAttribute('data-time') || '' };
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
