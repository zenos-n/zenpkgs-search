<script context="module" lang="ts">
	import type { Entry } from './lib/types';
	export type OptionNode = {
		label: string;
		path: string;
		children: Map<string, OptionNode>;
		entry?: Entry;
		kind: Entry['kind'];
	};
</script>

<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { TreeEntry } from './lib/types';
	import RegistryRow from './RegistryRow.svelte';
	import VirtualLeaves from './VirtualLeaves.svelte';
	export let nodes: Map<string, OptionNode>;
	export let expanded: Set<string>;
	export let onactivate: (entry: TreeEntry) => void;
	export let selected: Entry | null = null;
	export let scroller: HTMLDivElement;
	export let depth = 0;
	export let preserveOrder = false;
	$: sorted = preserveOrder
		? [...nodes.values()]
		: [...nodes.values()].sort((a, b) => a.label.localeCompare(b.label));
	$: virtual = sorted.length > 80 && sorted.every((node) => !node.children.size);
</script>

{#if virtual}
	<VirtualLeaves nodes={sorted} {depth} {expanded} {onactivate} {selected} {scroller} />
{:else}
	{#each sorted as node (node.path)}
		<div class="option-node">
			<RegistryRow {node} {depth} {expanded} {onactivate} {selected} />
			{#if node.children.size && expanded.has(`${node.kind}:${node.path}`)}
				<div class="option-children" transition:slide={{ duration: 250 }}>
					<svelte:self
						nodes={node.children}
						{expanded}
						{onactivate}
						{selected}
						{scroller}
						depth={depth + 1}
					/>
				</div>
			{/if}
		</div>
	{/each}
{/if}

<style>
	.option-children {
		overflow: hidden;
	}
</style>
