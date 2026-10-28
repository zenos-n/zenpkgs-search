import { categories } from './catalog';
import type { Entry, TreeEntry } from './types';

export function packageTree(entries: Entry[], expanded: Set<string>): TreeEntry[] {
	const packages = entries.filter((entry) => entry.kind === 'Package');
	const root = (label: string, path: string): TreeEntry => ({
		id: `pkgs.${path}`,
		kind: 'Package',
		meta: {},
		label,
		path,
		depth: 0,
		branch: true
	});
	const rows = [root('By reverse DNS notation', 'byReverseDNS')];
	if (expanded.has('Package:byReverseDNS'))
		rows.push(
			...packages.map((entry) => ({
				...entry,
				label: entry.id.slice(5),
				path: `byReverseDNS.${entry.id.slice(5)}`,
				depth: 1,
				branch: false
			}))
		);
	rows.push(root('By category', 'byCategories'));
	if (!expanded.has('Package:byCategories')) return rows;
	type Branch = { children: Map<string, Branch>; entry?: Entry };
	const tree: Branch = { children: new Map() };
	for (const entry of packages)
		for (const category of categories(entry.meta)) {
			let node = tree;
			for (const part of category.replace(/^(pkgs\.)?byCategories\./, '').split('.')) {
				if (!node.children.has(part)) node.children.set(part, { children: new Map() });
				node = node.children.get(part)!;
			}
			node.entry = entry;
		}
	function visit(node: Branch, prefix: string[], depth: number) {
		for (const [label, child] of [...node.children].sort(([a], [b]) => a.localeCompare(b))) {
			const path = [...prefix, label].join('.');
			const branch = child.children.size > 0;
			rows.push({
				...(child.entry || { id: `pkgs.${path}`, kind: 'Package', meta: {} }),
				label,
				path,
				depth,
				branch
			});
			if (branch && expanded.has(`Package:${path}`)) visit(child, [...prefix, label], depth + 1);
		}
	}
	visit(tree, ['byCategories'], 1);
	return rows;
}
