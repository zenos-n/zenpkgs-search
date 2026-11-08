export function webUrl(value: unknown): string | undefined {
	if (typeof value !== 'string') return;
	try {
		const url = new URL(value);
		if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
	} catch {
		/* Metadata can contain paths and theme icon names. */
	}
}

export function documentedValue(value: unknown): string {
	if (value && typeof value === 'object' && 'text' in value) return String(value.text);
	return JSON.stringify(value, null, 2) ?? '';
}

export function strings(value: unknown): string[] {
	return (Array.isArray(value) ? value : [value]).filter(
		(item): item is string => typeof item === 'string' && item.length > 0
	);
}

export function label(value: unknown): string {
	if (Array.isArray(value)) return value.map(label).join(', ');
	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		if (Array.isArray(record.licenses) && typeof record.operator === 'string') {
			return `(${record.licenses.map(label).join(` ${record.operator} `)})`;
		}
		return String(
			record.spdxId || record.shortName || record.fullName || record.name || documentedValue(value)
		);
	}
	return String(value);
}
