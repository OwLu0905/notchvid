export function getClientTz(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
