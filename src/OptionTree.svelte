<script lang="ts">
	import OptionBranch, { type OptionNode } from './OptionBranch.svelte';
	import type { Entry, TreeEntry } from './lib/types';
	export let entries: Entry[];
	export let expanded: Set<string>;
	export let onactivate: (entry: TreeEntry) => void;
	function build(source: Entry[]) {
		const roots = new Map<string, OptionNode>();
		for (const entry of source) {
			let children = roots;
			const parts = entry.id.split('.');
			parts.forEach((label, index) => {
				if (!children.has(label))
					children.set(label, {
						label,
						path: parts.slice(0, index + 1).join('.'),
						children: new Map()
					});
				const node = children.get(label)!;
				if (index === parts.length - 1) node.entry = entry;
				children = node.children;
			});
		}
		return roots;
	}
	$: nodes = build(entries);
</script>

<OptionBranch {nodes} {expanded} {onactivate} />
