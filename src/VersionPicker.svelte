<script lang="ts">
	import type { Version } from './lib/types';
	import './version-picker.css';
	import { popover } from './lib/motion';
	export let currentVersion: string;
	export let versions: Version[];
	export let versionsError: string;
	export let versionsLoading: boolean;
	export let versionOpen: boolean;
	export let menuOpen: boolean;
	export let onrefresh: () => void;
	export let onselectVersion: (version: Version) => void;
	export let onupload: (event: Event) => void;
	export let onreloadVersions: () => void;
	export let onchooseDiffBase: (version: Version) => void;
	let diffMode = false;
	$: releases = versions.filter((version) => version.id !== 'latestCommit');
	function choose(version: Version) {
		if (diffMode) onchooseDiffBase(version);
		else onselectVersion(version);
	}
</script>

<div class="version-wrap">
	<button
		class="version-button"
		aria-expanded={versionOpen}
		onclick={() => {
			menuOpen = false;
			versionOpen = !versionOpen;
		}}
	>
		{currentVersion}<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"><path d="M7 10l5 5 5-5z" /></svg
		>
	</button>
	{#if versionOpen}
		<div class="version-menu" transition:popover={{ y: -10, origin: 'top right' }}>
			<div class="version-list">
				<button
					class:active={currentVersion === 'Latest Commit'}
					onclick={() => {
						if (diffMode) onchooseDiffBase({ id: 'latestCommit', label: 'Latest Commit' });
						else onrefresh();
						versionOpen = false;
					}}>Latest Commit</button
				>
				{#if versionsLoading}<p class="version-message">
						Fetching releases…
					</p>{:else if versionsError}<p class="version-message" role="alert">
						{versionsError}
					</p>{:else if !releases.length}<p class="version-message">
						No registry releases published
					</p>{/if}
				{#if releases.length}<div class="version-separator"><span>Releases</span></div>{/if}
				{#each releases as version}
					<button class:active={currentVersion === version.label} onclick={() => choose(version)}
						>{version.label}</button
					>
				{/each}
			</div>
			<div class="version-footer">
				<button
					class:active={diffMode}
					onclick={() => (diffMode = !diffMode)}
					title="Toggle Diff Selection Mode">Diff</button
				>
				<label class="version-upload"
					><svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
						><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg
					>Upload<input
						type="file"
						accept=".json,application/json"
						onchange={onupload}
						hidden
					/></label
				>
				<button
					class="version-refresh"
					aria-label="Refresh versions"
					title="Refresh Versions"
					onclick={onreloadVersions}
				>
					<svg
						width="16"
						height="16"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
						aria-hidden="true"
						><path
							d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
						/></svg
					>
				</button>
			</div>
		</div>
	{/if}
</div>
