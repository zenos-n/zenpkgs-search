<script lang="ts">
	import type { Entry, TreeEntry, Section } from './lib/types';
	import OptionTree from './OptionTree.svelte';

	let treeAnimating = false;
	let animationTimer: ReturnType<typeof setTimeout>;
	function activate(entry: Entry) {
		if (isTreeEntry(entry) && entry.branch) {
			treeAnimating = true;
			clearTimeout(animationTimer);
			animationTimer = setTimeout(() => (treeAnimating = false), 260);
		}
		onactivate(entry);
	}
	export let section: Section;
	export let query: string;
	export let optionEntries: Entry[];
	export let expanded: Set<string>;
	export let treeFold: { anchor: number; size: number };
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
	export let onresetScroll: () => void;
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
	function revealRow(node: HTMLElement) {
		if (!treeAnimating || query) return { duration: 0 };
		const { anchor, size } = treeFold;
		const top = Number.parseFloat(node.style.top);
		return {
			duration: 250,
			css: (t: number) =>
				`clip-path: inset(0 0 ${Math.min(rowHeight, Math.max(0, top + rowHeight - anchor - size * t))}px 0);`
		};
	}
</script>

<main class="browser">
	{#if section === 'Packages' && !query}<div class="home-groups">
			<div class="group-label">Nix Options</div>
			<div class="home-group">
				<OptionTree entries={optionEntries} {expanded} onactivate={activate} />
			</div>
		</div>{/if}
	<div class="section-heading">
		<div>
			<h1>{section}</h1>
		</div>
		<span class="count"
			>{shown.length.toLocaleString()} {shown.length === 1 ? 'entry' : 'entries'}</span
		>
	</div>
	{#if loading}<div class="empty">
			<span class="spinner"></span>Fetching Registry…
		</div>{:else if error}<div class="empty error" role="alert">
			{error} <button onclick={onrefresh}>Retry</button>
		</div>{:else if !shown.length}<div class="empty">
			No matching entries. {#if query}<button
					onclick={() => {
						query = '';
						onresetScroll();
					}}>Clear search</button
				>{/if}
		</div>{:else}
		<div
			class="tree-scroll"
			class:tree-animating={treeAnimating}
			bind:this={scroller}
			use:observeScroller
			onscroll={(e) => (scrollTop = e.currentTarget.scrollTop)}
			role="listbox"
			aria-label={`${section} registry`}
		>
			<div class="virtual-space" style:height={`${shown.length * rowHeight}px`}>
				{#each visible as entry (entry.kind + (isTreeEntry(entry) ? entry.path : entry.id))}<button
						class:selected={selected?.id === entry.id}
						class="tree-row"
						style:top={`${shown.indexOf(entry) * rowHeight}px`}
						role="option"
						aria-selected={selected?.id === entry.id}
						onclick={() => activate(entry)}
						in:revealRow
						out:revealRow
						><span
							class="row-icon"
							class:expanded={isTreeEntry(entry) &&
								entry.branch &&
								expanded.has(`${entry.kind}:${entry.path}`)}
							style:margin-left={`${isTreeEntry(entry) ? entry.depth * 20 : 0}px`}
							>{isTreeEntry(entry) && entry.branch ? '▸' : '•'}</span
						><span class="row-label"
							>{isTreeEntry(entry) ? entry.label : entry.id.replace(/^pkgs\./, '')}</span
						><span class="row-type">{entry.kind}</span></button
					>{/each}
			</div>
		</div>
	{/if}
</main>
