<script context="module" lang="ts">
	import type { Entry } from './lib/types';
	export type OptionNode = {
		label: string;
		path: string;
		children: Map<string, OptionNode>;
		entry?: Entry;
	};
</script>

<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { TreeEntry } from './lib/types';
	export let nodes: Map<string, OptionNode>;
	export let expanded: Set<string>;
	export let onactivate: (entry: TreeEntry) => void;
	export let depth = 0;
</script>

{#each [...nodes.values()].sort((a, b) => a.label.localeCompare(b.label)) as node (node.path)}
	<div class="option-node">
		<button
			onclick={() =>
				onactivate({
					...(node.entry || { id: node.path, kind: 'Option', meta: {} }),
					path: node.path,
					label: node.label,
					branch: !!node.children.size,
					depth
				})}
		>
			<span class="group-chevron" class:expanded={expanded.has(`Option:${node.path}`)}
				>{node.children.size ? '▸' : '•'}</span
			>{node.label}
		</button>
		{#if node.children.size && expanded.has(`Option:${node.path}`)}
			<div class="option-children" transition:slide={{ duration: 250 }}>
				<svelte:self nodes={node.children} {expanded} {onactivate} depth={depth + 1} />
			</div>
		{/if}
	</div>
{/each}

<style>
	.option-children {
		margin-left: 20px;
		border-left: 1px solid var(--border-color);
		overflow: hidden;
	}
	.option-node > button {
		min-height: 44px;
		flex-shrink: 0;
	}
</style>
