<script lang="ts">
	import { tick } from 'svelte';
	import type { LegacyNewsItem } from './LegacyDialogs.svelte';
	import { stackEnter, stackExit } from './lib/motion';
	import NewsArticle from './NewsArticle.svelte';
	export let news: LegacyNewsItem[];
	export let newsLoading: boolean;
	export let newsPage: 'latest' | 'archive' | 'entry';
	export let selectedNews: number;
	export let onselectentry: (index: number) => void;
	export let oncreatorclick: (name: string, target: HTMLElement) => void;
	export let direction: number;
</script>

<div class="legacy-stack news-stack">
	{#if newsLoading}<div
			class="stack-page loading-state"
			data-direction={direction}
			in:stackEnter={{ direction }}
			out:stackExit
		>
			<span class="legacy-spinner"></span>
			<p>Loading developer news…</p>
		</div>
	{:else if !news.length}<div
			class="stack-page empty-state"
			data-direction={direction}
			in:stackEnter={{ direction }}
			out:stackExit
		>
			<strong>No news available</strong>
			<p>Developer updates will appear here.</p>
		</div>
	{:else if newsPage === 'archive'}
		<div class="stack-page" data-direction={direction} in:stackEnter={{ direction }} out:stackExit>
			<div class="legacy-group news-archive">
				{#each news.slice(1) as item, offset}<button
						class="legacy-row"
						onclick={async () => {
							direction = 1;
							await tick();
							selectedNews = offset + 1;
							newsPage = 'entry';
							onselectentry(offset + 1);
						}}
						><span><strong>{item.title || 'Update'}</strong><small>{item.date || ''}</small></span
						><span aria-hidden="true">›</span></button
					>{/each}
			</div>
		</div>
	{:else}
		<NewsArticle
			item={news[newsPage === 'latest' ? 0 : selectedNews]}
			latest={newsPage === 'latest'}
			hasArchive={news.length > 1}
			{direction}
			onarchive={async () => {
				direction = 1;
				await tick();
				newsPage = 'archive';
			}}
			{oncreatorclick}
		/>
	{/if}
</div>
