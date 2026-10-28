export interface CatalogMeta {
	id?: string;
	kind?: string;
	name?: string;
	summary?: string;
	description?: string;
	categoryPaths?: string[][];
	categoryPath?: string[];
	categoryTarget?: string[];
	aliases?: string[];
	[key: string]: unknown;
}

export interface CatalogNode {
	meta?: CatalogMeta;
	sub?: Record<string, CatalogNode>;
	[key: string]: unknown;
}

export interface Catalog {
	pkgs?: Record<string, CatalogNode>;
	[key: string]: unknown;
}

export function flattenOptions(
	nodes: Record<string, CatalogNode> | undefined
): Array<[string, CatalogNode]> {
	const entries: Array<[string, CatalogNode]> = [];
	function visit(children: Record<string, CatalogNode> | undefined, prefix: string[] = []): void {
		for (const [key, node] of Object.entries(children || {})) {
			if (!node || typeof node !== 'object') continue;
			const path = [...prefix, key];
			if (node.sub && Object.keys(node.sub).length) visit(node.sub, path);
			else if (node.meta) entries.push([path.join('.'), node]);
		}
	}
	visit(nodes);
	return entries;
}

export function categories(meta: CatalogMeta): string[] {
	return (meta.categoryPaths || [meta.categoryPath || meta.categoryTarget])
		.filter((parts): parts is string[] => Array.isArray(parts))
		.map((parts) => parts.join('.'));
}

export function matches(key: string, node: CatalogNode | undefined, query: string): boolean {
	const meta: CatalogMeta = node?.meta || {};
	return [
		key,
		meta.id,
		meta.name,
		meta.summary,
		meta.description,
		...categories(meta),
		...(meta.aliases || [])
	]
		.filter((value) => typeof value === 'string')
		.join(' ')
		.toLowerCase()
		.includes(query.toLowerCase());
}

export function normalize<T extends Catalog | null | undefined>(data: T): T {
	if (!data?.pkgs) return data;
	const records = new Map<string, CatalogNode>();
	function visit(nodes: Record<string, CatalogNode> | undefined, prefix: string[] = []): void {
		for (const [key, node] of Object.entries(nodes || {})) {
			if (!node || typeof node !== 'object') continue;
			const path = [...prefix, key];
			const meta: CatalogMeta = node.meta || {};
			const children = node.sub && Object.keys(node.sub).length;
			if (meta.kind === 'package-set' || (children && meta.kind !== 'package')) {
				visit(node.sub, path);
				continue;
			}
			// Empty/depth-limited namespaces are not packages.
			if (meta.kind === 'package-set' || (path[0] === 'byCategories' && !meta.id)) continue;
			const declaredId = meta.id || path.join('.');
			const id = declaredId.startsWith('pkgs.') ? declaredId : `pkgs.${declaredId}`;
			const alias = path[0] === 'byCategories';
			const previous = records.get(id);
			const categoryPaths = [...(previous?.meta?.categoryPaths || [])];
			for (const category of [
				...(meta.categoryPaths || []),
				meta.categoryPath,
				meta.categoryTarget && ['pkgs', 'byCategories', ...meta.categoryTarget],
				alias && ['pkgs', ...path]
			]) {
				if (
					Array.isArray(category) &&
					!categoryPaths.some((p) => p.join('.') === category.join('.'))
				)
					categoryPaths.push(category);
			}
			const aliases = [
				...new Set([
					...(previous?.meta?.aliases || []),
					...(meta.aliases || []),
					...(alias ? [`pkgs.${path.join('.')}`] : [])
				])
			];
			const preferred = previous && alias ? previous.meta : meta;
			records.set(id, { meta: { ...preferred, id, categoryPaths, aliases } });
		}
	}
	visit(data.pkgs);
	return {
		...data,
		pkgs: Object.fromEntries(
			[...records]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([id, node]) => [id.replace(/^pkgs\./, ''), node])
		)
	} as T;
}
