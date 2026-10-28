export interface NewsItem {
	id?: string;
	title?: string;
	content?: string;
	body?: string;
	date?: string;
	url?: string;
	authors?: string[];
}

const raw = 'https://raw.githubusercontent.com/zenos-n/zenpkgs/news';
const api = 'https://api.github.com/repos/zenos-n/zenpkgs/contents?ref=news';
const filename = /^[a-zA-Z0-9.-]+\.json$/;

export async function loadNewsFile(name = 'latest.json'): Promise<NewsItem> {
	if (!filename.test(name)) throw new Error('Invalid news filename');
	const response = await fetch(`${raw}/${name}`);
	if (!response.ok) throw new Error(`News request failed (${response.status})`);
	const item: unknown = await response.json();
	if (!item || typeof item !== 'object' || Array.isArray(item))
		throw new Error('Invalid news item');
	return item as NewsItem;
}

export async function listNewsFiles(token = ''): Promise<string[]> {
	try {
		const response = await fetch(api, {
			headers: token ? { Authorization: `Bearer ${token}` } : {}
		});
		if (!response.ok) throw new Error(`Archive request failed (${response.status})`);
		const entries: unknown = await response.json();
		if (!Array.isArray(entries)) throw new Error('Invalid news archive');
		return entries
			.filter((entry): entry is { name: string } => entry && typeof entry.name === 'string')
			.map((entry) => entry.name)
			.filter((name) => filename.test(name) && name !== 'latest.json')
			.sort((a, b) => b.localeCompare(a));
	} catch {
		const response = await fetch(`${import.meta.env.BASE_URL}news-archive.json`);
		if (!response.ok) return [];
		const entries: unknown = await response.json();
		return Array.isArray(entries)
			? entries
					.filter((name): name is string => typeof name === 'string' && filename.test(name))
					.sort((a, b) => b.localeCompare(a))
			: [];
	}
}
