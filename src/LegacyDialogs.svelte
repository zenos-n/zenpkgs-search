<script context="module" lang="ts">
	export type LegacyDialogKind = '' | 'settings' | 'about' | 'news' | 'keybinds';
	export type LegacyPreferences = {
		theme: 'system' | 'light' | 'dark';
		accent: string;
		reduceMotion: boolean;
		customCss: string;
		githubToken: string;
		geminiKey: string;
		transparency?: number;
		customFont?: string;
		advancedScratchpad?: boolean;
		comboTimeout?: number;
	};
	export type LegacyNewsItem = {
		id?: string;
		title?: string;
		body?: string;
		content?: string;
		date?: string;
		url?: string;
		authors?: string[];
	};
	export type LegacyAboutLinks = {
		registry: string;
		website: string;
		license: string;
	};

	export const legacyKeybindDefaults: Record<string, string> = {
		search: 'Ctrl+f',
		up: 'ArrowUp',
		down: 'ArrowDown',
		left: 'ArrowLeft',
		right: 'ArrowRight',
		copyId: 'Ctrl+c',
		copyDesc: 'Ctrl+Shift+c',
		version: 'Ctrl+,',
		settings: 'Ctrl+.',
		about: 'Ctrl+Shift+a',
		top: 'Home',
		bottom: 'End',
		nextMatch: 'F3',
		prevMatch: 'Shift+F3'
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import './legacy-dialogs.css';
	import SettingsDialog from './SettingsDialog.svelte';
	import KeybindsDialog from './KeybindsDialog.svelte';
	import AboutDialog from './AboutDialog.svelte';
	import NewsDialog from './NewsDialog.svelte';
	import { modalBackdrop, modalWindow } from './lib/motion';

	const accentOptions = [
		['blue', '#3584e4'],
		['teal', '#2190a4'],
		['green', '#3a944a'],
		['yellow', '#c88800'],
		['orange', '#ed5b00'],
		['red', '#e62d42'],
		['pink', '#d56199'],
		['purple', '#9141ac'],
		['slate', '#6f8396']
	] as const;
	const keybindLabels: Record<string, string> = {
		search: 'Search',
		up: 'Up',
		down: 'Down',
		left: 'Left (Close / Parent)',
		right: 'Right (Open / Child)',
		copyId: 'Copy ID',
		copyDesc: 'Copy Description',
		version: 'Switch Version',
		settings: 'Open Settings',
		about: 'Open About',
		top: 'Go to Top',
		bottom: 'Go to Bottom',
		nextMatch: 'Next Match',
		prevMatch: 'Previous Match'
	};
	const presetValues: Record<string, Record<string, string>> = {
		standard: legacyKeybindDefaults,
		vim: {
			...legacyKeybindDefaults,
			search: '/',
			up: 'k',
			down: 'j',
			left: 'h',
			right: 'l',
			copyId: 'y',
			copyDesc: 'Shift+y',
			top: 'g g',
			bottom: 'Shift+g',
			nextMatch: 'n',
			prevMatch: 'Shift+n'
		},
		emacs: {
			...legacyKeybindDefaults,
			search: 'Ctrl+s',
			up: 'Ctrl+p',
			down: 'Ctrl+n',
			left: 'Ctrl+b',
			right: 'Ctrl+f',
			copyId: 'Alt+w',
			copyDesc: 'Alt+Shift+w',
			top: 'Alt+<',
			bottom: 'Alt+>',
			nextMatch: 'Ctrl+g',
			prevMatch: 'Ctrl+Shift+g'
		}
	};

	export let open: LegacyDialogKind = '';
	export let preferences: LegacyPreferences = {
		theme: 'dark',
		accent: '#9141ac',
		reduceMotion: false,
		customCss: '',
		githubToken: '',
		geminiKey: '',
		transparency: 0.06,
		customFont: '',
		advancedScratchpad: false,
		comboTimeout: 500
	};
	export let keybinds: Record<string, string> = legacyKeybindDefaults;
	export let news: LegacyNewsItem[] = [];
	export let newsLoading = false;
	export let onselectnews: (index: number) => void = () => {};
	export let oncreatorclick: (name: string, target: HTMLElement) => void = () => {};
	export let appVersion = 'v1.1.2';
	export let aboutLinks: LegacyAboutLinks = {
		registry: 'https://github.com/zenos-n/zenpkgs',
		website: 'https://github.com/zenos-n/zenpkgs-search',
		license: 'https://github.com/zenos-n/zenpkgs-search/blob/main/LICENSE'
	};
	export let onclose: () => void = () => {};
	export let onpreferenceschange: (preferences: LegacyPreferences) => void = () => {};
	export let onkeybindschange: (keybinds: Record<string, string>) => void = () => {};
	export let onclearcache: () => void = () => {};

	let aboutPage: 'main' | 'legal' | 'credits' = 'main';
	let newsPage: 'latest' | 'archive' | 'entry' = 'latest';
	let selectedNews = 0;
	let newsDirection = 1;
	let aboutDirection = 1;

	$: if (open !== 'about') aboutPage = 'main';
	$: if (open !== 'news') {
		newsPage = 'latest';
		selectedNews = 0;
	}

	function updatePreference<K extends keyof LegacyPreferences>(
		key: K,
		value: LegacyPreferences[K]
	) {
		onpreferenceschange({ ...preferences, [key]: value });
	}
	function updateKeybind(key: string, value: string) {
		onkeybindschange({ ...keybinds, [key]: value });
	}
	function applyPreset(name: string) {
		if (presetValues[name]) onkeybindschange({ ...presetValues[name] });
	}
	function formatKeybind(value: string) {
		return value
			.replace(/ArrowUp/g, '↑')
			.replace(/ArrowDown/g, '↓')
			.replace(/ArrowLeft/g, '←')
			.replace(/ArrowRight/g, '→')
			.replace(/Ctrl\+/gi, 'Ctrl ')
			.replace(/Shift\+/gi, 'Shift ')
			.replace(/Alt\+/gi, 'Alt ');
	}
	function handleWindowKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') onclose();
	}
	function closeFromBackdrop(event: MouseEvent) {
		if (event.target === event.currentTarget) onclose();
	}
	$: dialogTitle =
		open === 'about'
			? aboutPage === 'main'
				? 'About'
				: aboutPage === 'legal'
					? 'Legal'
					: 'Credits'
			: open === 'news'
				? newsPage === 'latest'
					? 'Developer News'
					: newsPage === 'archive'
						? 'News Archive'
						: news[selectedNews]?.title || 'Developer News'
				: open === 'keybinds'
					? 'Keyboard Shortcuts'
					: 'Settings';
	async function goBack() {
		if (open === 'about') {
			aboutDirection = -1;
			await tick();
			aboutPage = 'main';
		}
		if (open === 'news') {
			newsDirection = -1;
			await tick();
			newsPage = newsPage === 'entry' ? 'archive' : 'latest';
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="legacy-dialogs"
		role="presentation"
		onclick={closeFromBackdrop}
		transition:modalBackdrop
	>
		<div
			class:about-wide={open === 'about' && aboutPage !== 'main'}
			class="legacy-window legacy-window--{open}"
			role="dialog"
			aria-modal="true"
			aria-label={dialogTitle}
			transition:modalWindow
		>
			<header class="legacy-header">
				{#if (open === 'about' && aboutPage !== 'main') || (open === 'news' && newsPage !== 'latest')}
					<button class="legacy-icon-button" aria-label="Back" onclick={goBack}>
						<svg viewBox="0 0 16 16" aria-hidden="true"
							><path
								d="M9.3 13.7 4.3 8.7a1 1 0 0 1 0-1.4l5-5a1 1 0 1 1 1.4 1.4L6.4 8l4.3 4.3a1 1 0 0 1-1.4 1.4Z"
							/></svg
						>
					</button>
				{:else}<span aria-hidden="true"></span>{/if}
				<h2>{dialogTitle}</h2>
				<button class="legacy-close" aria-label="Close" onclick={onclose}>
					<svg viewBox="0 0 8 8" aria-hidden="true"
						><path
							d="M2.5 4 0 1.5V0h1.5L4 2.5 6.5 0H8v1.5L5.5 4 8 6.5V8H6.5L4 5.5 1.5 8H0V6.5L2.5 4Z"
						/></svg
					>
				</button>
			</header>

			{#if open === 'settings'}
				<SettingsDialog
					{preferences}
					{keybinds}
					{accentOptions}
					{keybindLabels}
					{updatePreference}
					{updateKeybind}
					{applyPreset}
					{onclearcache}
				/>
			{:else if open === 'keybinds'}
				<KeybindsDialog {keybinds} {keybindLabels} {formatKeybind} />
			{:else if open === 'about'}
				<AboutDialog bind:aboutPage bind:direction={aboutDirection} {aboutLinks} {appVersion} />
			{:else if open === 'news'}
				<NewsDialog
					{news}
					{newsLoading}
					bind:newsPage
					bind:selectedNews
					bind:direction={newsDirection}
					onselectentry={onselectnews}
					{oncreatorclick}
				/>
			{/if}
		</div>
	</div>
{/if}
