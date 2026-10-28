<script lang="ts">
	import DOMPurify from 'dompurify';
	import { marked } from 'marked';
	import type { LegacyNewsItem } from './LegacyDialogs.svelte';
	import { stackEnter, stackExit } from './lib/motion';
	export let item: LegacyNewsItem;
	export let latest: boolean;
	export let hasArchive: boolean;
	export let direction: number;
	export let onarchive: () => void;
	export let oncreatorclick: (name: string, target: HTMLElement) => void;
	function markdown(value = ''): string {
		return DOMPurify.sanitize(marked.parse(value, { async: false }) as string);
	}
</script>

<div
	class="stack-page news-article"
	data-direction={direction}
	in:stackEnter={{ direction }}
	out:stackExit
>
	<div class="news-heading">
		<h1>{item.title || 'Update'}</h1>
		<div class="news-meta">
			<time>{item.date || ''}</time>
			{#each item.authors || [] as author}
				<span class="news-meta-dot" aria-hidden="true">•</span>
				<button
					class="author-chip"
					onclick={(event) => oncreatorclick(author, event.currentTarget)}
				>
					<svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"
						><path
							d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
						/></svg
					>
					{author}
				</button>
			{/each}
		</div>
	</div>
	{#if item.body || item.content}<div class="markdown-body">
			{@html markdown(item.body || item.content)}
		</div>{/if}
	<div class="news-actions">
		{#if item.url}<a class="action-link" href={item.url} target="_blank" rel="noreferrer"
				>Read more</a
			>{/if}
		{#if latest && hasArchive}<button class="archive-button" onclick={onarchive}
				>View Archive</button
			>{/if}
	</div>
</div>
