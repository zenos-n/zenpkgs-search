<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import localforage from 'localforage';
	import {
		normalize,
		matches,
		flattenOptions,
		type Catalog,
		type CatalogMeta
	} from './lib/catalog';
	import { clearRegistryCache, loadLatest, loadVersion, listVersions } from './lib/registry';
	import { loadNewsFile, listNewsFiles, type NewsItem } from './lib/news';
	import type { Entry, TreeEntry, Version, Preferences, Section, Dialog } from './lib/types';
	import BrowserHeader from './BrowserHeader.svelte';
	import CatalogBrowser from './CatalogBrowser.svelte';
	import EntryInspector from './EntryInspector.svelte';
	import LegacyDialogs, {
		legacyKeybindDefaults,
		type LegacyDialogKind
	} from './LegacyDialogs.svelte';
	import ScratchpadPanel from './ScratchpadPanel.svelte';
	import ActionDialogs from './ActionDialogs.svelte';
	import MaintainerPopover from './MaintainerPopover.svelte';
	import { packageTree } from './lib/package-tree';
	const defaults: Preferences = {
		theme: 'dark',
		accent: '#9141ac',
		reduceMotion: false,
		customCss: '',
		githubToken: '',
		geminiKey: ''
	};
	const rowHeight = 44;
	const read = <T,>(key: string, fallback: T): T => {
		try {
			return JSON.parse(localStorage.getItem(key) || '') as T;
		} catch {
			return fallback;
		}
	};
	const save = (key: string, value: unknown) => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			/* Private browsing can disable storage. */
		}
	};
	let prefs = read<Preferences>('zenpkgs-search-preferences', defaults);
	let favorites = read<string[]>('zenpkgs-search-favorites', []);
	let recents = read<string[]>('zenpkgs-search-recents', []);
	let scratchpad = read<string>(
		'zenpkgs-search-scratchpad',
		'{ pkgs, ... }: {\n  environment.systemPackages = with pkgs; [\n  ];\n}\n'
	);
	let catalog: Catalog | null = null;
	let entries: Entry[] = [];
	let query = '';
	let section: Section = 'Packages';
	let selected: Entry | null = null;
	let loading = true;
	let error = '';
	let status = '';
	let statusTimer: ReturnType<typeof setTimeout> | undefined;
	function announce(message: string) {
		status = message;
		clearTimeout(statusTimer);
		statusTimer = setTimeout(() => (status = ''), 4000);
	}
	let scrollTop = 0;
	let viewportHeight = 600;
	let scroller: HTMLDivElement;
	let searchInput: HTMLInputElement;
	let modal: Dialog = '';
	let scratchpadOpen = false;
	let keybinds = read<Record<string, string>>('zenpkgs-search-keybinds', legacyKeybindDefaults);
	let paletteQuery = '';
	let versions: Version[] = [];
	let versionsError = '';
	let versionsLoading = false;
	let currentVersion = 'Latest Commit';
	let versionOpen = false;
	let diffBase: Catalog | null = null;
	let diffLabel = '';
	let news: NewsItem[] = [];
	let newsLoading = false;
	let aiText = '';
	let aiBusy = false;
	let searchOpen = false;
	let menuOpen = false;
	let newsUnread = true;
	let expanded = new Set<string>();
	let searchHistory = read<string[]>('zenpkgs-search-searches', []);
	let maintainerPopup: { name: string; data: CatalogMeta; anchor: HTMLElement } | null = null;
	const legacyAccent: Record<string, string> = {
		blue: '#3584e4',
		teal: '#2190a4',
		green: '#3a944a',
		yellow: '#c88800',
		orange: '#ed5b00',
		red: '#e62d42',
		pink: '#d56199',
		purple: '#9141ac',
		slate: '#6f8396'
	};

	function treeRows(kind: 'Package' | 'Option', open: Set<string>, source: Entry[]): TreeEntry[] {
		type Branch = { children: Map<string, Branch>; entry?: Entry };
		const root: Branch = { children: new Map() };
		for (const entry of source.filter((e) => e.kind === kind)) {
			const parts = (kind === 'Package' ? entry.id.slice(5) : entry.id).split('.');
			let node = root;
			for (const part of parts) {
				if (!node.children.has(part)) node.children.set(part, { children: new Map() });
				node = node.children.get(part)!;
			}
			node.entry = entry;
		}
		const rows: TreeEntry[] = [];
		function visit(node: Branch, prefix: string[], depth: number) {
			for (const [label, child] of [...node.children].sort(([a], [b]) => a.localeCompare(b))) {
				const path = [...prefix, label].join('.');
				const branch = child.children.size > 0;
				const id = kind === 'Package' ? `pkgs.${path}` : path;
				rows.push({ ...(child.entry || { id, kind, meta: {} }), label, depth, branch, path });
				if (branch && open.has(`${kind}:${path}`)) visit(child, [...prefix, label], depth + 1);
			}
		}
		visit(root, [], 0);
		return rows;
	}
	$: shown = (
		query
			? entries
			: section === 'Options'
				? treeRows('Option', expanded, entries)
				: section === 'Packages'
					? packageTree(entries, expanded)
					: entries
	).filter((e) => {
		if (section === 'Favorites' && !favorites.includes(e.id)) return false;
		if (section === 'Recent' && !recents.includes(e.id)) return false;
		if (!query && section === 'Packages' && e.kind !== 'Package') return false;
		if (!query && section === 'Options' && e.kind !== 'Option') return false;
		if (section === 'Maintainers' && e.kind !== 'Maintainer') return false;
		return !query || matches(e.id, { meta: e.meta }, query);
	});
	function activate(entry: Entry | TreeEntry) {
		if ('branch' in entry && entry.branch && !query) {
			const key = `${entry.kind}:${entry.path}`;
			const next = new Set(expanded);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			expanded = next;
			return;
		}
		select(entry);
	}
	$: visibleStart = Math.max(0, Math.floor(scrollTop / rowHeight) - 8);
	$: visibleEnd = Math.min(shown.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 8);
	$: visible = shown.slice(visibleStart, visibleEnd);
	$: paletteItems = [
		{ label: 'Add to Scratchpad', action: () => addToScratchpad() },
		{ label: 'Change Version', action: () => (versionOpen = true) },
		{ label: 'Clear Registry Cache', action: () => clearCache() },
		{ label: 'Collapse Tree', action: () => (expanded = new Set()) },
		{ label: 'Command List', action: () => (modal = 'keybinds') },
		{
			label: 'Copy Description',
			action: () => void copy(String(selected?.meta.summary || selected?.meta.description || ''))
		},
		{
			label: 'Copy Documentation',
			action: () =>
				void copy(String(selected?.meta.description || selected?.meta.longDescription || ''))
		},
		{ label: 'Copy Identifier', action: () => void copy(selected?.id || '') },
		{ label: 'Open About', action: () => (modal = 'about') },
		{
			label: 'Open GitHub Repo',
			action: () =>
				window.open('https://github.com/zenos-n/zenpkgs-search', '_blank', 'noopener,noreferrer')
		},
		{ label: 'Open Settings', action: () => (modal = 'settings') },
		{ label: 'Search Registry', action: () => focusSearch() },
		{ label: 'Packages', action: () => chooseSection('Packages') },
		{ label: 'Options', action: () => chooseSection('Options') },
		{ label: 'Maintainers', action: () => chooseSection('Maintainers') },
		{ label: 'Favorites', action: () => chooseSection('Favorites') },
		{ label: 'Recent', action: () => chooseSection('Recent') },
		{ label: 'Config Scratchpad', action: () => (scratchpadOpen = true) },
		{ label: 'Developer News', action: () => openNews() }
	].filter((item) => item.label.toLowerCase().includes(paletteQuery.toLowerCase()));

	function flatten(data: Catalog): Entry[] {
		const normalized = normalize(data)!;
		const output: Entry[] = [];
		for (const [id, node] of Object.entries(normalized.pkgs || {}))
			output.push({ id: `pkgs.${id}`, kind: 'Package', meta: node.meta || {}, node });
		for (const [id, node] of flattenOptions(data.options as Record<string, { meta?: CatalogMeta }>))
			output.push({ id, kind: 'Option', meta: node?.meta || {}, node });
		for (const [id, value] of Object.entries(
			(data.maintainers || {}) as Record<string, CatalogMeta>
		))
			output.push({ id, kind: 'Maintainer', meta: value || {}, node: value });
		return output.sort((a, b) => a.id.localeCompare(b.id));
	}
	function setCatalog(data: Catalog, label: string) {
		catalog = data;
		entries = flatten(data);
		currentVersion = label;
		selected = entries.find((e) => e.id === selected?.id) || null;
		const deepLink = decodeURIComponent(location.hash.slice(1));
		if (deepLink) {
			const [kind, ...parts] = deepLink.split(':');
			const id = parts.join(':');
			selected =
				entries.find(
					(e) =>
						e.kind.toLowerCase() ===
							(kind === 'pkgs' ? 'package' : kind === 'options' ? 'option' : 'maintainer') &&
						e.id === (kind === 'pkgs' && !id.startsWith('pkgs.') ? `pkgs.${id}` : id)
				) || selected;
		}
		loading = false;
		error = '';
	}
	async function refresh() {
		loading = true;
		error = '';
		try {
			setCatalog(await loadLatest({ token: prefs.githubToken }), 'Latest Commit');
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		}
	}
	async function selectVersion(version: Version) {
		versionOpen = false;
		loading = true;
		error = '';
		try {
			setCatalog(await loadVersion(version.id, { token: prefs.githubToken }), version.label);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		}
	}
	async function upload(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			const parsed = JSON.parse(await file.text());
			if (!parsed || typeof parsed !== 'object' || (!parsed.pkgs && !parsed.options))
				throw new Error('This is not a ZenPkgs registry JSON file.');
			setCatalog(parsed, file.name);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}
	function chooseSection(value: typeof section) {
		section = value;
		query = '';
		resetScroll();
		modal = '';
	}
	function navigateBreadcrumb(kind: Entry['kind'], path: string) {
		const id = kind === 'Package' ? `pkgs.${path}` : path;
		const entry = entries.find((item) => item.kind === kind && item.id === id);
		if (entry) select(entry);
		else if (kind === 'Option') {
			section = 'Options';
			expanded = new Set([...expanded, `Option:${path}`]);
		}
	}
	function showMaintainer(name: string, anchor: HTMLElement) {
		const data = (catalog?.maintainers as Record<string, CatalogMeta> | undefined)?.[name] || {
			name
		};
		maintainerPopup = { name, data, anchor };
	}

	function resetScroll() {
		scrollTop = 0;
		if (scroller) scroller.scrollTop = 0;
	}
	function select(entry: Entry) {
		selected = entry;
		const kind =
			entry.kind === 'Package' ? 'pkgs' : entry.kind === 'Option' ? 'options' : 'maintainers';
		history.replaceState(
			null,
			'',
			`#${kind}:${encodeURIComponent(entry.kind === 'Package' ? entry.id.slice(5) : entry.id)}`
		);
		recents = [entry.id, ...recents.filter((id) => id !== entry.id)].slice(0, 30);
		save('zenpkgs-search-recents', recents);
		aiText = '';
	}
	function toggleFavorite() {
		if (!selected) return;
		favorites = favorites.includes(selected.id)
			? favorites.filter((id) => id !== selected?.id)
			: [...favorites, selected.id];
		save('zenpkgs-search-favorites', favorites);
	}
	function rememberSearch() {
		if (!query.trim()) return;
		searchHistory = [query.trim(), ...searchHistory.filter((s) => s !== query.trim())].slice(0, 12);
		save('zenpkgs-search-searches', searchHistory);
	}
	function focusSearch() {
		modal = '';
		searchOpen = true;
		tick().then(() => searchInput?.focus());
	}
	function randomEntry() {
		const pool = entries.filter((e) => e.kind === 'Package');
		if (pool.length) select(pool[Math.floor(Math.random() * pool.length)]);
	}
	function persistPrefs() {
		save('zenpkgs-search-preferences', prefs);
		applyPrefs();
	}
	function applyPrefs() {
		document.documentElement.dataset.theme = prefs.theme;
		document.documentElement.style.setProperty('--accent', prefs.accent);
		document.documentElement.style.setProperty(
			'--card-opacity',
			String(prefs.transparency ?? 0.06)
		);
		document.documentElement.style.setProperty(
			'--font-ui',
			prefs.customFont || "'Atkinson Hyperlegible Next', sans-serif"
		);
		document.documentElement.style.setProperty(
			'--font-mono',
			prefs.customFont || "'Atkinson Hyperlegible Mono', monospace"
		);
		document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion);
		let style = document.getElementById('custom-css') as HTMLStyleElement | null;
		if (!style) {
			style = document.createElement('style');
			style.id = 'custom-css';
			document.head.append(style);
		}
		style.textContent = prefs.customCss;
	}
	async function copy(value: string) {
		try {
			await navigator.clipboard.writeText(value);
			announce('Copied to clipboard');
		} catch {
			announce('Clipboard unavailable; select and copy the text manually');
		}
	}
	function addToScratchpad() {
		if (!selected) return;
		const line =
			selected.kind === 'Package'
				? `  ${selected.id.replace(/^pkgs\./, '')}`
				: `  ${selected.id} = ${selected.meta.default !== undefined ? String(selected.meta.default) : 'true'};`;
		if (selected.kind === 'Package') {
			if (!/environment\.systemPackages\s*=\s*with pkgs;\s*\[/.test(scratchpad))
				scratchpad += '\n{ pkgs, ... }: {\n  environment.systemPackages = with pkgs; [\n  ];\n}\n';
			scratchpad = scratchpad.replace(
				/(environment\.systemPackages\s*=\s*with pkgs;\s*\[)/,
				`$1\n${line}`
			);
		} else {
			if (!scratchpad.trim()) scratchpad = '{ pkgs, ... }: {\n}\n';
			scratchpad = /}\s*$/.test(scratchpad)
				? scratchpad.replace(/}\s*$/, `${line}\n}\n`)
				: `${scratchpad}\n${line}\n`;
		}
		save('zenpkgs-search-scratchpad', scratchpad);
		announce('Added to scratchpad');
		scratchpadOpen = true;
	}
	async function loadNews() {
		if (newsLoading || news.length) return;
		newsLoading = true;
		try {
			const [latest, archive] = await Promise.all([
				loadNewsFile(),
				listNewsFiles(prefs.githubToken)
			]);
			news = [latest, ...archive.map((name) => ({ id: name, title: name.replace(/\.json$/, '') }))];
		} catch {
			announce('News is unavailable right now');
		} finally {
			newsLoading = false;
		}
	}
	async function selectNewsEntry(index: number) {
		const item = news[index];
		if (!item?.id || item.content || item.body) return;
		newsLoading = true;
		try {
			const loaded = await loadNewsFile(item.id);
			news = news.map((entry, position) => (position === index ? loaded : entry));
		} catch {
			announce('Could not load that news article');
		} finally {
			newsLoading = false;
		}
	}
	function openNews() {
		newsUnread = false;
		modal = 'news';
		void loadNews();
	}
	async function explain() {
		if (!selected || !prefs.geminiKey) {
			modal = 'settings';
			return;
		}
		aiBusy = true;
		aiText = '';
		try {
			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(prefs.geminiKey)}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						contents: [
							{
								parts: [
									{
										text: `Explain this ZenPkgs ${selected.kind.toLowerCase()} briefly and accurately: ${selected.id}\n${selected.meta.description || selected.meta.summary || ''}`
									}
								]
							}
						]
					})
				}
			);
			if (!response.ok) throw new Error(`AI request failed (${response.status})`);
			const result = await response.json();
			aiText =
				result.candidates?.[0]?.content?.parts
					?.map((p: { text?: string }) => p.text || '')
					.join('') || 'No explanation returned.';
		} catch (e) {
			aiText = e instanceof Error ? e.message : String(e);
		} finally {
			aiBusy = false;
		}
	}
	async function chooseDiffBase(version: Version) {
		try {
			diffBase = await loadVersion(version.id, { token: prefs.githubToken });
			diffLabel = version.label;
			modal = 'diff';
			versionOpen = false;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}
	function diffStatus(entry: Entry): string {
		if (!diffBase) return '';
		const before = flatten(diffBase).find((e) => e.id === entry.id);
		if (!before) return 'Added';
		return JSON.stringify(before.meta) === JSON.stringify(entry.meta) ? 'Unchanged' : 'Modified';
	}
	function onKey(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		const typing = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			modal = 'palette';
			return;
		}
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
			event.preventDefault();
			focusSearch();
			return;
		}
		if (event.key === 'Escape') {
			query = '';
			searchOpen = false;
			modal = '';
			maintainerPopup = null;
			versionOpen = false;
			scratchpadOpen = false;
			return;
		}
		if (typing) return;
		if (event.key === '/') {
			event.preventDefault();
			focusSearch();
		}
		if (event.key === 'ArrowDown' && shown.length) {
			event.preventDefault();
			const i = shown.findIndex((e) => e.id === selected?.id);
			select(shown[Math.min(shown.length - 1, i + 1)]);
		}
		if (event.key === 'ArrowUp' && shown.length) {
			event.preventDefault();
			const i = shown.findIndex((e) => e.id === selected?.id);
			select(shown[Math.max(0, i - 1)]);
		}
	}
	async function reloadVersions() {
		versionsLoading = true;
		versionsError = '';
		try {
			versions = await listVersions({ token: prefs.githubToken });
		} catch (error) {
			versionsError = `Could not fetch releases: ${String(error)}`;
		} finally {
			versionsLoading = false;
		}
	}

	function clearCache() {
		clearRegistryCache()
			.then(() => announce('Registry cache cleared'))
			.catch((error) => announce(`Could not clear cache: ${String(error)}`));
	}
	async function migrateLegacySettings() {
		const store = localforage.createInstance({ name: 'settings' });
		try {
			if (!localStorage.getItem('zenpkgs-search-preferences')) {
				const old = await store.getItem<Record<string, unknown>>('user_prefs');
				if (old) {
					prefs = {
						...defaults,
						theme: old.theme === 'light' ? 'light' : 'dark',
						accent: legacyAccent[String(old.accent)] || defaults.accent,
						reduceMotion: Boolean(old.reducedMotion),
						customCss: String(old.customCSS || ''),
						githubToken: String(old.ghToken || ''),
						geminiKey: String(old.geminiKey || '')
					};
					persistPrefs();
				}
			}
			const old = await store.getItem<{
				favorites?: string[];
				recents?: string[];
				searchHistory?: string[];
				scratchpadConfig?: string;
			}>('user_history');
			if (old) {
				const convert = (items: string[] = []) =>
					items.map((key) => {
						const at = key.indexOf(':');
						const kind = key.slice(0, at);
						const path = key.slice(at + 1);
						return kind === 'pkgs' ? (path.startsWith('pkgs.') ? path : `pkgs.${path}`) : path;
					});
				if (!localStorage.getItem('zenpkgs-search-favorites')) {
					favorites = convert(old.favorites);
					save('zenpkgs-search-favorites', favorites);
				}
				if (!localStorage.getItem('zenpkgs-search-recents')) {
					recents = convert(old.recents);
					save('zenpkgs-search-recents', recents);
				}
				if (!localStorage.getItem('zenpkgs-search-searches')) {
					searchHistory = old.searchHistory || [];
					save('zenpkgs-search-searches', searchHistory);
				}
				if (!localStorage.getItem('zenpkgs-search-scratchpad') && old.scratchpadConfig) {
					scratchpad = old.scratchpadConfig;
					save('zenpkgs-search-scratchpad', scratchpad);
				}
			}
		} catch {
			/* Existing data stays untouched if migration is unavailable. */
		}
	}
	onMount(() => {
		applyPrefs();
		void loadNews();
		void migrateLegacySettings().then(() => {
			refresh();
			void reloadVersions();
		});
		window.addEventListener('keydown', onKey);
		const closePopovers = (event: PointerEvent) => {
			if (!(event.target as Element).closest('.nav-menu, .mobile-menu')) menuOpen = false;
			if (!(event.target as Element).closest('.version-wrap')) versionOpen = false;
		};
		window.addEventListener('pointerdown', closePopovers);
		return () => {
			clearTimeout(statusTimer);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('pointerdown', closePopovers);
		};
	});
</script>

<svelte:head><title>{selected ? `${selected.id} · ZenPkgs` : 'ZenPkgs Search'}</title></svelte:head>
<div class="app">
	<BrowserHeader
		bind:selected
		bind:query
		bind:searchOpen
		bind:menuOpen
		{newsUnread}
		bind:versionOpen
		bind:searchInput
		{currentVersion}
		{versions}
		{versionsError}
		{versionsLoading}
		onfocusSearch={focusSearch}
		onresetScroll={resetScroll}
		onrememberSearch={rememberSearch}
		onhome={() => {
			selected = null;
			resetScroll();
		}}
		onchooseSection={chooseSection}
		onbreadcrumb={navigateBreadcrumb}
		onrandomEntry={randomEntry}
		onrefresh={refresh}
		onselectVersion={selectVersion}
		onupload={upload}
		onreloadVersions={reloadVersions}
		onchooseDiffBase={chooseDiffBase}
		onopenNews={openNews}
		onmodal={(dialog) => (modal = dialog)}
	/>
	<div class="workspace">
		<CatalogBrowser
			{section}
			bind:query
			{entries}
			optionEntries={entries.filter((entry) => entry.kind === 'Option')}
			{expanded}
			{shown}
			{visible}
			{selected}
			{loading}
			{error}
			bind:scroller
			bind:scrollTop
			onscrollerresize={(height) => (viewportHeight = height)}
			{rowHeight}
			onactivate={activate}
			onrefresh={refresh}
		/>
		<EntryInspector
			{selected}
			{favorites}
			{aiBusy}
			{aiText}
			{news}
			hasDiff={!!diffBase}
			{diffLabel}
			showAI={!!prefs.geminiKey}
			ontoggleFavorite={toggleFavorite}
			onaddToScratchpad={addToScratchpad}
			oncopy={copy}
			onexplain={explain}
			onopenNews={openNews}
			oncreatorclick={showMaintainer}
			ondiffStatus={diffStatus}
		/>
	</div>
	{#if status}<div class="status" role="status" transition:fly={{ y: 20, duration: 300 }}>
			{status}
		</div>{/if}
</div>

<LegacyDialogs
	open={(['settings', 'about', 'news', 'keybinds'].includes(modal)
		? modal
		: '') as LegacyDialogKind}
	preferences={prefs}
	{keybinds}
	{news}
	{newsLoading}
	onselectnews={selectNewsEntry}
	oncreatorclick={showMaintainer}
	onclose={() => {
		modal = '';
		maintainerPopup = null;
	}}
	onpreferenceschange={(value) => {
		prefs = value;
		persistPrefs();
	}}
	onkeybindschange={(value) => {
		keybinds = value;
		save('zenpkgs-search-keybinds', value);
	}}
	onclearcache={clearCache}
/>
{#if maintainerPopup}<MaintainerPopover
		{...maintainerPopup}
		onclose={() => (maintainerPopup = null)}
	/>{/if}
<ScratchpadPanel
	bind:open={scratchpadOpen}
	bind:value={scratchpad}
	onchange={(value) => save('zenpkgs-search-scratchpad', value)}
	oncopy={copy}
/>
<ActionDialogs
	open={modal === 'palette' || modal === 'diff' ? modal : ''}
	bind:paletteQuery
	{paletteItems}
	{currentVersion}
	{diffLabel}
	onclose={() => (modal = '')}
	onselect={(item) => {
		item.action();
		if (modal === 'palette') modal = '';
	}}
	oncleardiff={() => {
		diffBase = null;
		modal = '';
	}}
/>
