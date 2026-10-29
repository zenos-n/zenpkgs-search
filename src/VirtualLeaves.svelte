<script lang="ts">
	import { onMount } from 'svelte';
	import type { OptionNode } from './OptionBranch.svelte';
	import type { Entry, TreeEntry } from './lib/types';
	import RegistryRow from './RegistryRow.svelte';
	export let nodes: OptionNode[];
	export let depth: number;
	export let expanded: Set<string>;
	export let selected: Entry | null;
	export let onactivate: (entry: TreeEntry) => void;
	export let scroller: HTMLDivElement;
	let container: HTMLDivElement;
	let start = 0,
		end = 40;
	const height = 44;
	function measure() {
		if (!container || !scroller) return;
		const relativeTop =
			scroller.getBoundingClientRect().top - container.getBoundingClientRect().top;
		start = Math.min(
			Math.max(0, nodes.length - 1),
			Math.max(0, Math.floor(relativeTop / height) - 8)
		);
		end = Math.min(
			nodes.length,
			Math.max(start + 1, Math.ceil((relativeTop + scroller.clientHeight) / height) + 8)
		);
	}
	onMount(() => {
		scroller.addEventListener('scroll', measure, { passive: true });
		const observer = new ResizeObserver(measure);
		observer.observe(scroller);
		observer.observe(container);
		for (const child of scroller.children) observer.observe(child);
		measure();
		return () => {
			scroller.removeEventListener('scroll', measure);
			observer.disconnect();
		};
	});
	$: (nodes, container && measure());
</script>

<div bind:this={container} class="virtual-space" style:height={`${nodes.length * height}px`}>
	<div style:height={`${start * height}px`}></div>
	{#each nodes.slice(start, end) as node (node.path)}
		<RegistryRow {node} {depth} {expanded} {selected} {onactivate} />
	{/each}
</div>
