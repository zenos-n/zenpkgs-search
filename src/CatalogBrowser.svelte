<script lang="ts">
	import type { Entry, TreeEntry, Section } from './lib/types';
	import OptionTree from './OptionTree.svelte';

	export let section: Section;
	export let query: string;
	export let optionEntries: Entry[];
	export let expanded: Set<string>;
	export let shown: Entry[];
	export let visible: Entry[];
	export let selected: Entry | null;
	export let loading: boolean;
	export let error: string;
	export let scroller: HTMLDivElement;
	export let scrollTop: number;
	export let rowHeight: number;
	export let onactivate: (entry: Entry | TreeEntry) => void;
	export let onrefresh: () => void;
	export let onscrollerresize: (height: number) => void;
	function observeScroller(node: HTMLDivElement) {
		const observer = new ResizeObserver(() => onscrollerresize(node.clientHeight));
		observer.observe(node);
		onscrollerresize(node.clientHeight);
		return { destroy: () => observer.disconnect() };
	}
	function isTreeEntry(entry: Entry): entry is TreeEntry {
		return 'depth' in entry && 'path' in entry;
	}
	import OptionBranch, { type OptionNode } from './OptionBranch.svelte';
	import { categories } from './lib/catalog';
	function packageNodes(entries: Entry[]) {
		const rdns: OptionNode = {
			label: 'By reverse DNS notation',
			path: 'byReverseDNS',
			kind: 'Package',
			children: new Map()
		};
		const category: OptionNode = {
			label: 'By category',
			path: 'byCategories',
			kind: 'Package',
			children: new Map()
		};
		for (const entry of entries) {
			if (entry.kind !== 'Package') continue;
			const label = entry.id.replace(/^pkgs\./, '');
			rdns.children.set(label, {
				label,
				path: `byReverseDNS.${label}`,
				kind: 'Package',
				entry,
				children: new Map()
			});
			for (const name of categories(entry.meta)) {
				let node = category;
				for (const label of name.replace(/^(pkgs\.)?byCategories\./, '').split('.')) {
					if (!node.children.has(label))
						node.children.set(label, {
							label,
							path: `${node.path}.${label}`,
							kind: 'Package',
							children: new Map()
						});
					node = node.children.get(label)!;
				}
				node.entry = entry;
			}
		}
		return new Map([
			[rdns.path, rdns],
			[category.path, category]
		]);
	}
	export let entries: Entry[];
	$: packages = packageNodes(entries);
</script>

<main class="browser">
	<div
		class="tree-scroll"
		bind:this={scroller}
		use:observeScroller
		onscroll={(e) => (scrollTop = e.currentTarget.scrollTop)}
	>
		{#if section === 'Packages' && !query}
			<div class="home-groups">
				<div class="group-label">Nix Options</div>
				<div class="home-group">
					<OptionTree entries={optionEntries} {expanded} {selected} {scroller} {onactivate} />
				</div>
			</div>
		{/if}
		<div class="section-heading"><h1>{section}</h1></div>
		{#if loading}<div class="empty"><span class="spinner"></span>Fetching Registry…</div>
		{:else if error}<div class="empty error" role="alert">
				{error}<button onclick={onrefresh}>Retry</button>
			</div>
		{:else if !shown.length}<div class="empty">No matching entries.</div>
		{:else if section === 'Packages' && !query}
			<div class="home-group">
				<OptionBranch
					nodes={packages}
					preserveOrder
					{expanded}
					{selected}
					{scroller}
					{onactivate}
				/>
			</div>
		{:else if section === 'Options' && !query}
			<div class="home-group">
				<OptionTree entries={optionEntries} {expanded} {selected} {scroller} {onactivate} />
			</div>
		{:else}
			<div class="virtual-space" style:height={`${shown.length * rowHeight}px`}>
				{#each visible as entry (entry.kind + entry.id)}
					<button
						class="tree-row"
						class:selected={selected?.id === entry.id}
						style:top={`${shown.indexOf(entry) * rowHeight}px`}
						onclick={() => onactivate(entry)}
					>
						<span class="row-label">{entry.id.replace(/^pkgs\./, '')}</span><span class="row-type"
							>{entry.kind}</span
						>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</main>
