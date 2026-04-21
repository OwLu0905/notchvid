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
