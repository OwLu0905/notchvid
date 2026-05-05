export function clampToViewport(
	coords: { left: number; top: number },
	size: { width: number; height: number },
	padding = 8
): { left: number; top: number } {
	const maxLeft = window.innerWidth - size.width - padding;
	const maxTop = window.innerHeight - size.height - padding;
	return {
		left: Math.max(padding, Math.min(coords.left, maxLeft)),
		top: Math.max(padding, Math.min(coords.top, maxTop))
	};
}

export function getScrollContainer(el: HTMLElement | null): HTMLElement | null {
	let node: HTMLElement | null = el?.parentElement ?? null;
	while (node) {
		const overflowY = getComputedStyle(node).overflowY;
		if (overflowY === 'auto' || overflowY === 'scroll') return node;
		node = node.parentElement;
	}
	return null;
}

const SAFE_URL_RE = /^(?:https?:|mailto:|#|\/(?!\/))/i;

export function safeUrl(href: unknown): string {
	const s = typeof href === 'string' ? href.trim() : '';
	return SAFE_URL_RE.test(s) ? s : '';
}

// Allow any CSS color expression — named colors, #hex, rgb()/rgba(), hsl(),
// oklch(from var(--x) ...), var(--token), etc. — but block characters that
// would let the value break out of its `background-color: …;` declaration:
//   `;` adds new declarations, `{}` opens blocks, `<>` would only matter if
//   serialized into raw HTML, `\` introduces CSS unicode escapes that can be
//   mis-parsed by older engines.
export function safeColor(color: unknown, fallback = 'red'): string {
	if (typeof color !== 'string') return fallback;
	const s = color.trim();
	if (s.length === 0 || s.length > 200) return fallback;
	if (/[;{}<>\\]/.test(s)) return fallback;
	return s;
}

type ProseMark = { type?: unknown; attrs?: Record<string, unknown> };
type ProseNode = { marks?: unknown; content?: unknown; [k: string]: unknown };

function sanitizeMark(mark: unknown): ProseMark | null {
	if (!mark || typeof mark !== 'object') return null;
	const m = mark as ProseMark;
	if (m.type === 'link' && m.attrs) {
		m.attrs.href = safeUrl(m.attrs.href);
	}
	if (m.type === 'highlight' && m.attrs) {
		m.attrs.color = safeColor(m.attrs.color);
	}
	return m;
}

export function sanitizeProseNode<T>(node: T): T {
	if (!node || typeof node !== 'object') return node;
	const n = node as ProseNode;
	if (Array.isArray(n.marks)) {
		n.marks = n.marks.map(sanitizeMark).filter((m): m is ProseMark => m !== null);
	}
	if (Array.isArray(n.content)) {
		n.content = n.content.map((child) => sanitizeProseNode(child));
	}
	return node;
}
