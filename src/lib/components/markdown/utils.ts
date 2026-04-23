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
