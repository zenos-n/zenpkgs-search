<script lang="ts">
	import type { Entry, Version, Section, Dialog } from './lib/types';
	import VersionPicker from './VersionPicker.svelte';
	import { popover } from './lib/motion';
	export let selected: Entry | null;
	export let query: string;
	export let searchOpen: boolean;
	export let menuOpen: boolean;
	export let newsUnread: boolean;
	export let versionOpen: boolean;
	export let currentVersion: string;
	export let versions: Version[];
	export let versionsError: string;
	export let versionsLoading: boolean;
	export let searchInput: HTMLInputElement;
	export let onfocusSearch: () => void;
	export let onresetScroll: () => void;
	export let onrememberSearch: () => void;
	export let onhome: () => void;
	export let onchooseSection: (section: Section) => void;
	export let onbreadcrumb: (kind: Entry['kind'], path: string) => void;
	export let onrandomEntry: () => void;
	export let onrefresh: () => void;
	export let onselectVersion: (version: Version) => void;
	export let onupload: (event: Event) => void;
	export let onreloadVersions: () => void;
	export let onchooseDiffBase: (version: Version) => void;
	export let onopenNews: () => void;
	export let onmodal: (dialog: Dialog) => void;
</script>

<header class="topbar">
	<button
		class="icon-button search-toggle"
		aria-label="Focus search"
		onclick={() => {
			if (searchOpen) {
				query = '';
				searchOpen = false;
				onresetScroll();
			} else onfocusSearch();
		}}
		><svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg
		></button
	>
	<button
		class="icon-button mobile-menu"
		aria-label="Open menu"
		onclick={() => {
			versionOpen = false;
			menuOpen = !menuOpen;
		}}
		><svg
			width="18"
			height="18"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			viewBox="0 0 24 24"
			aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg
		>{#if newsUnread}<span class="menu-notification" aria-hidden="true"></span>{/if}</button
	>
	{#if menuOpen}<div class="nav-menu" transition:popover={{ y: -20, origin: 'top center' }}>
			<button
				onclick={() => {
					onmodal('settings');
					menuOpen = false;
				}}>Settings <span>Ctrl+.</span></button
			>
			<button
				onclick={() => {
					onmodal('keybinds');
					menuOpen = false;
				}}>Keybinds <span>Ctrl+/</span></button
			>
			<button
				onclick={() => {
					onopenNews();
					menuOpen = false;
				}}
				>Developer News {#if newsUnread}<span class="news-notification" aria-hidden="true"
					></span>{/if}</button
			>
			<button
				onclick={() => {
					onmodal('palette');
					menuOpen = false;
				}}>Command Palette <span>Ctrl+K</span></button
			>
			<button
				onclick={() => {
					onmodal('about');
					menuOpen = false;
				}}>About <span>Ctrl+Shift+A</span></button
			>
		</div>{/if}
	<div class="brand">
		<svg
			class="brand-mark"
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
			><path
				fill-rule="evenodd"
				d="M12.5 7a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
			/></svg
		><span>ZenPkgs</span>
	</div>
	<div class:searching={searchOpen || !!query} class="search-wrap">
		<div class="breadcrumbs" class:hidden={searchOpen || !!query}>
			<button
				class="crumb-btn"
				onclick={() => {
					onhome();
					onresetScroll();
				}}
				><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"
					><path
						fill-rule="evenodd"
						d="M12.5 7a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
					/></svg
				><span>zenpkgs</span></button
			>{#if selected}<span class="crumb-sep">›</span><button
					class="crumb-btn"
					onclick={() =>
						onchooseSection(
							selected?.kind === 'Option'
								? 'Options'
								: selected?.kind === 'Maintainer'
									? 'Maintainers'
									: 'Packages'
						)}
					>{selected.kind === 'Package'
						? 'pkgs'
						: selected.kind === 'Option'
							? 'options'
							: 'maintainers'}</button
				>
				{@const parts =
					selected.kind === 'Package'
						? [selected.id.replace(/^pkgs\./, '')]
						: selected.id.split('.')}
				{#each parts as part, index}
					<span class="crumb-sep">›</span>
					<button
						class="crumb-btn"
						class:active={index === parts.length - 1}
						onclick={() => onbreadcrumb(selected!.kind, parts.slice(0, index + 1).join('.'))}
						>{part}</button
					>
				{/each}
			{/if}
		</div>
		<div class="search-overlay" class:visible={searchOpen || !!query}>
			<input
				bind:this={searchInput}
				bind:value={query}
				oninput={onresetScroll}
				onkeydown={(e) => {
					if (e.key === 'Enter') onrememberSearch();
				}}
				type="search"
				aria-label="Search registry"
				placeholder="Search registry..."
			/><kbd>/</kbd>
		</div>
	</div>
	<button
		class="icon-button"
		title="Surprise me"
		aria-label="Random package"
		onclick={onrandomEntry}
		><svg
			width="16"
			height="16"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			viewBox="0 0 24 24"
			aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l5 5M4 4l5 5" /></svg
		></button
	>
	<VersionPicker
		{currentVersion}
		{versions}
		{versionsError}
		{versionsLoading}
		bind:versionOpen
		bind:menuOpen
		{onrefresh}
		{onselectVersion}
		{onupload}
		{onreloadVersions}
		{onchooseDiffBase}
	/>
</header>
