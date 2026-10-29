<script lang="ts">
	import type { OptionNode } from './OptionBranch.svelte';
	import type { Entry, TreeEntry } from './lib/types';
	export let node: OptionNode;
	export let depth: number;
	export let expanded: Set<string>;
	export let selected: Entry | null;
	export let onactivate: (entry: TreeEntry) => void;
	$: branch = node.children.size > 0;
</script>

<button
	class="registry-row"
	class:tree-row={node.kind === 'Package'}
	class:selected={!!node.entry && selected?.id === node.entry.id}
	aria-expanded={branch ? expanded.has(`${node.kind}:${node.path}`) : undefined}
	style:padding-left={`${16 + depth * 20}px`}
	onclick={() =>
		onactivate({
			...(node.entry || { id: node.path, kind: node.kind, meta: {} }),
			path: node.path,
			label: node.label,
			branch,
			depth
		})}
>
	<span class="group-chevron" class:expanded={branch && expanded.has(`${node.kind}:${node.path}`)}
		>{branch ? '▸' : '•'}</span
	>
	<span class="row-label">{node.label}</span>
</button>

<style>
	.registry-row {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		height: 44px;
		min-height: 44px;
		padding: 0 16px;
		border: 0;
		border-radius: 0;
		background: transparent;
		color: var(--text-color);
		text-align: left;
		cursor: pointer;
	}
	.registry-row:hover {
		background: var(--card-bg);
	}
	.registry-row.selected {
		background: color-mix(in srgb, var(--accent-bg) 20%, transparent);
	}
	.group-chevron {
		display: inline-grid;
		place-items: center;
		width: 16px;
		flex: none;
		color: var(--secondary-label);
		transition: transform 0.2s;
	}
	.group-chevron.expanded {
		transform: rotate(90deg);
	}
</style>
