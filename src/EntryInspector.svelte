<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { categories } from './lib/catalog';
	import type { Entry } from './lib/types';
	import './entry-inspector.css';

	export let selected: Entry | null;
	export let favorites: string[];
	export let optionValue: string;
	export let aiBusy: boolean;
	export let aiText: string;
	export let news: Array<{ title?: string; body?: string; date?: string; url?: string }>;
	export let hasDiff: boolean;
	export let diffLabel: string;
	export let showAI: boolean;
	export let ontoggleFavorite: () => void;
	export let onaddToScratchpad: () => void;
	export let oncopy: (value: string) => void | Promise<void>;
	export let onexplain: () => void;
	export let onopenNews: () => void;
	export let oncreatorclick: (name: string, target: HTMLElement) => void;
	export let ondiffStatus: (entry: Entry) => string;

	function maintainerName(value: unknown): string {
		if (typeof value === 'string') return value;
		if (value && typeof value === 'object' && 'name' in value) return String(value.name);
		return 'Unknown';
	}
	function markdown(value: unknown): string {
		return DOMPurify.sanitize(marked.parse(String(value), { async: false }) as string);
	}
</script>

<section class="inspector" aria-label="Entry details">
	{#if selected}
		{@const shortDescription = selected.meta.summary || selected.meta.description}
		{@const longDescription = selected.meta.summary
			? selected.meta.description
			: selected.meta.longDescription}
		<div class="inspector-inner">
			<div class="identifier-heading">
				<div class="eyebrow">Identifier</div>
				<button onclick={ontoggleFavorite} aria-label="Toggle favorite" title="Toggle favorite">
					{#if favorites.includes(selected.id)}★{:else}☆{/if}
				</button>
			</div>
			<div class="identifier-card">
				<div class="entry-id">{selected.id}</div>
				<div class="inspector-actions">
					<button onclick={onaddToScratchpad}>+ Add to Scratchpad</button>
					<button onclick={() => selected && oncopy(selected.id)}>Copy ID</button>
				</div>
			</div>

			{#if selected.meta.type}
				<div class="inspector-section">
					<h3>Type</h3>
					<div class="inspector-card">
						{typeof selected.meta.type === 'string' ? selected.meta.type : 'Complex'}
					</div>
				</div>
			{/if}
			{#if showAI}
				<div class="inspector-section">
					<h3>Smart Assistant <span>✦ Gemini</span></h3>
					<div class="inspector-card ai-card">
						<button onclick={onexplain} disabled={aiBusy}
							>{aiBusy ? 'Explaining…' : '✦ Explain & Generate Config'}</button
						>
						{#if aiText}<div class="markdown">{@html markdown(aiText)}</div>{/if}
					</div>
				</div>
			{/if}
			{#if shortDescription}
				<div class="inspector-section">
					<h3>Description</h3>
					<div class="inspector-card description-card">{String(shortDescription)}</div>
				</div>
			{/if}
			{#if Array.isArray(selected.meta.maintainers) && selected.meta.maintainers.length}
				<div class="inspector-section">
					<h3>Maintainers</h3>
					<div class="maintainer-chips">
						{#each selected.meta.maintainers as maintainer}
							<button
								class="maintainer-chip"
								onclick={(event) => oncreatorclick(maintainerName(maintainer), event.currentTarget)}
								>{maintainerName(maintainer)}</button
							>
						{/each}
					</div>
				</div>
			{/if}
			{#if longDescription}
				<div class="inspector-section">
					<h3>Documentation</h3>
					<div class="inspector-card markdown">{@html markdown(longDescription)}</div>
				</div>
			{/if}
			{#if selected.kind === 'Package' && categories(selected.meta).length}
				<div class="inspector-section">
					<h3>Category</h3>
					<div class="inspector-card category-card">
						{#each categories(selected.meta) as category}<div>{category}</div>{/each}
					</div>
				</div>
			{/if}
			{#if selected.kind === 'Option'}
				<div class="inspector-section">
					<h3>Value</h3>
					<div class="inspector-card">
						{#if selected.meta.default !== undefined}<div>
								Default: <code>{String(selected.meta.default)}</code>
							</div>{/if}
						<label>Value for scratchpad<input bind:value={optionValue} placeholder="true" /></label>
					</div>
				</div>
			{/if}
			{#if selected.kind === 'Maintainer' && selected.meta.github}
				<div class="inspector-section">
					<h3>GitHub</h3>
					<div class="inspector-card">
						<a href={`https://github.com/${selected.meta.github}`} target="_blank" rel="noreferrer"
							>{selected.meta.github}</a
						>
					</div>
				</div>
			{/if}
			{#if hasDiff}<div class="inspector-section">
					<h3>Compared with {diffLabel}</h3>
					<div class="inspector-card">{ondiffStatus(selected)}</div>
				</div>{/if}
		</div>
	{:else}
		<div class="inspector-empty">
			<span>i</span>
			<h2>ZenPkgs Explorer</h2>
			<p>Select an option to view details.</p>
			<button class="news-preview" onclick={onopenNews}>
				<span>NEW</span><strong>{news[0]?.title || 'Developer News'}</strong>
				{#if news[0]?.date}<time>{news[0].date}</time>{/if}<small>Read Article →</small>
			</button>
			<p class="keyboard-hint">Ctrl+F to search<br />ArrowUp/ArrowDown to navigate</p>
		</div>
	{/if}
</section>
