<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import localforage from 'localforage';
  import { normalize, matches, categories, type Catalog, type CatalogMeta } from './lib/catalog';
  import { loadLatest, loadVersion, listVersions } from './lib/registry';

  type Entry = { id: string; kind: 'Package' | 'Option' | 'Maintainer'; meta: CatalogMeta; node?: unknown };
  type Version = { id: string; label: string };
  type Preferences = { theme: 'system' | 'light' | 'dark'; accent: string; reduceMotion: boolean; customCss: string; githubToken: string; geminiKey: string };
  const defaults: Preferences = { theme: 'system', accent: '#9b75d6', reduceMotion: false, customCss: '', githubToken: '', geminiKey: '' };
  const rowHeight = 44;
  const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; } };
  const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing can disable storage. */ } };
  let prefs = read<Preferences>('zenpkgs-search-preferences', defaults);
  let favorites = read<string[]>('zenpkgs-search-favorites', []);
  let recents = read<string[]>('zenpkgs-search-recents', []);
  let scratchpad = read<string>('zenpkgs-search-scratchpad', '{ pkgs, ... }: {\n  environment.systemPackages = with pkgs; [\n  ];\n}\n');
  let catalog: Catalog | null = null;
  let entries: Entry[] = [];
  let query = '';
  let section: 'Packages' | 'Options' | 'Maintainers' | 'Favorites' | 'Recent' = 'Packages';
  let selected: Entry | null = null;
  let loading = true;
  let error = '';
  let status = '';
  let scrollTop = 0;
  let viewportHeight = 600;
  let scroller: HTMLDivElement;
  let searchInput: HTMLInputElement;
  let modal: '' | 'settings' | 'about' | 'news' | 'palette' | 'scratchpad' | 'diff' = '';
  let paletteQuery = '';
  let versions: Version[] = [];
  let currentVersion = 'Latest Commit';
  let versionOpen = false;
  let diffBase: Catalog | null = null;
  let diffLabel = '';
  let news: Array<{ title?: string; body?: string; date?: string; url?: string }> = [];
  let aiText = '';
  let aiBusy = false;
  let mobileSidebar = false;
  let searchHistory = read<string[]>('zenpkgs-search-searches', []);
  let optionValue = '';
  const legacyAccent: Record<string, string> = { blue: '#3584e4', teal: '#2190a4', green: '#3a944a', yellow: '#c88800', orange: '#ed5b00', red: '#e62d42', pink: '#d56199', purple: '#9141ac', slate: '#6f8396' };

  $: shown = entries.filter(e => {
    if (section === 'Favorites' && !favorites.includes(e.id)) return false;
    if (section === 'Recent' && !recents.includes(e.id)) return false;
    if (section === 'Packages' && e.kind !== 'Package') return false;
    if (section === 'Options' && e.kind !== 'Option') return false;
    if (section === 'Maintainers' && e.kind !== 'Maintainer') return false;
    return !query || matches(e.id, { meta: e.meta }, query);
  });
  $: visibleStart = Math.max(0, Math.floor(scrollTop / rowHeight) - 8);
  $: visibleEnd = Math.min(shown.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 8);
  $: visible = shown.slice(visibleStart, visibleEnd);
  $: paletteItems = [
    { label: 'Search registry', action: () => focusSearch() },
    { label: 'Packages', action: () => chooseSection('Packages') },
    { label: 'Options', action: () => chooseSection('Options') },
    { label: 'Maintainers', action: () => chooseSection('Maintainers') },
    { label: 'Favorites', action: () => chooseSection('Favorites') },
    { label: 'Recent', action: () => chooseSection('Recent') },
    { label: 'Config scratchpad', action: () => modal = 'scratchpad' },
    { label: 'Settings', action: () => modal = 'settings' },
    { label: 'Developer news', action: () => openNews() },
  ].filter(item => item.label.toLowerCase().includes(paletteQuery.toLowerCase()));

  function flatten(data: Catalog): Entry[] {
    const normalized = normalize(data)!;
    const output: Entry[] = [];
    for (const [id, node] of Object.entries(normalized.pkgs || {})) output.push({ id: `pkgs.${id}`, kind: 'Package', meta: node.meta || {}, node });
    for (const [id, node] of Object.entries((data.options || {}) as Record<string, { meta?: CatalogMeta }>)) output.push({ id, kind: 'Option', meta: node?.meta || {}, node });
    for (const [id, value] of Object.entries((data.maintainers || {}) as Record<string, CatalogMeta>)) output.push({ id, kind: 'Maintainer', meta: value || {}, node: value });
    return output.sort((a, b) => a.id.localeCompare(b.id));
  }
  function setCatalog(data: Catalog, label: string) {
    catalog = data;
    entries = flatten(data);
    currentVersion = label;
    selected = entries.find(e => e.id === selected?.id) || null;
    const deepLink = decodeURIComponent(location.hash.slice(1));
    if (deepLink) {
      const [kind, ...parts] = deepLink.split(':');
      const id = parts.join(':');
      selected = entries.find(e => e.kind.toLowerCase() === (kind === 'pkgs' ? 'package' : kind === 'options' ? 'option' : 'maintainer') && e.id === (kind === 'pkgs' && !id.startsWith('pkgs.') ? `pkgs.${id}` : id)) || selected;
    }
    loading = false;
    error = '';
    status = `${entries.length.toLocaleString()} entries loaded`;
  }
  async function refresh() {
    loading = true; error = '';
    try { setCatalog(await loadLatest(), 'Latest Commit'); }
    catch (e) { error = e instanceof Error ? e.message : String(e); loading = false; }
  }
  async function selectVersion(version: Version) {
    versionOpen = false; loading = true; error = '';
    try { setCatalog(await loadVersion(version.id), version.label); }
    catch (e) { error = e instanceof Error ? e.message : String(e); loading = false; }
  }
  async function upload(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || (!parsed.pkgs && !parsed.options)) throw new Error('This is not a ZenPkgs registry JSON file.');
      setCatalog(parsed, file.name);
    } catch (e) { error = e instanceof Error ? e.message : String(e); }
  }
  function chooseSection(value: typeof section) { section = value; scrollTop = 0; if (scroller) scroller.scrollTop = 0; mobileSidebar = false; modal = ''; }
  function select(entry: Entry) { selected = entry; const kind = entry.kind === 'Package' ? 'pkgs' : entry.kind === 'Option' ? 'options' : 'maintainers'; history.replaceState(null, '', `#${kind}:${encodeURIComponent(entry.kind === 'Package' ? entry.id.slice(5) : entry.id)}`); recents = [entry.id, ...recents.filter(id => id !== entry.id)].slice(0, 30); save('zenpkgs-search-recents', recents); aiText = ''; mobileSidebar = false; }
  function toggleFavorite() { if (!selected) return; favorites = favorites.includes(selected.id) ? favorites.filter(id => id !== selected?.id) : [...favorites, selected.id]; save('zenpkgs-search-favorites', favorites); }
  function rememberSearch() { if (!query.trim()) return; searchHistory = [query.trim(), ...searchHistory.filter(s => s !== query.trim())].slice(0, 12); save('zenpkgs-search-searches', searchHistory); }
  function focusSearch() { modal = ''; tick().then(() => searchInput?.focus()); }
  function randomEntry() { const pool = entries.filter(e => e.kind === 'Package'); if (pool.length) select(pool[Math.floor(Math.random() * pool.length)]); }
  function persistPrefs() { save('zenpkgs-search-preferences', prefs); applyPrefs(); }
  function applyPrefs() {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.style.setProperty('--accent', prefs.accent);
    document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion);
    let style = document.getElementById('custom-css') as HTMLStyleElement | null;
    if (!style) { style = document.createElement('style'); style.id = 'custom-css'; document.head.append(style); }
    style.textContent = prefs.customCss;
  }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); status = 'Copied to clipboard'; } catch { status = 'Clipboard unavailable; select and copy the text manually'; } }
  function addToScratchpad() {
    if (!selected) return;
    const line = selected.kind === 'Package' ? `  ${selected.id.replace(/^pkgs\./, '')}` : `  ${selected.id} = ${optionValue || (selected.meta.default ? String(selected.meta.default) : 'true')};`;
    if (selected.kind === 'Package') scratchpad = scratchpad.replace(/(environment\.systemPackages\s*=\s*with pkgs;\s*\[)/, `$1\n${line}`);
    else scratchpad += `\n${line}\n`;
    save('zenpkgs-search-scratchpad', scratchpad); status = 'Added to scratchpad'; modal = 'scratchpad';
  }
  async function openNews() {
    modal = 'news';
    if (news.length) return;
    try { const response = await fetch('https://raw.githubusercontent.com/zenos-n/zenpkgs/news/latest.json'); if (response.ok) { const body = await response.json(); news = Array.isArray(body) ? body : [{ title: body.title, body: body.content, date: body.date }]; } }
    catch { status = 'News is unavailable right now'; }
  }
  async function explain() {
    if (!selected || !prefs.geminiKey) { modal = 'settings'; return; }
    aiBusy = true; aiText = '';
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(prefs.geminiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Explain this ZenPkgs ${selected.kind.toLowerCase()} briefly and accurately: ${selected.id}\n${selected.meta.description || selected.meta.summary || ''}` }] }] }) });
      if (!response.ok) throw new Error(`AI request failed (${response.status})`);
      const result = await response.json(); aiText = result.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || 'No explanation returned.';
    } catch (e) { aiText = e instanceof Error ? e.message : String(e); }
    finally { aiBusy = false; }
  }
  async function chooseDiffBase(version: Version) { try { diffBase = await loadVersion(version.id); diffLabel = version.label; modal = 'diff'; versionOpen = false; } catch (e) { error = e instanceof Error ? e.message : String(e); } }
  function diffStatus(entry: Entry): string {
    if (!diffBase) return '';
    const before = flatten(diffBase).find(e => e.id === entry.id);
    if (!before) return 'Added';
    return JSON.stringify(before.meta) === JSON.stringify(entry.meta) ? 'Unchanged' : 'Modified';
  }
  function onKey(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const typing = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); modal = 'palette'; return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); focusSearch(); return; }
    if (event.key === 'Escape') { modal = ''; versionOpen = false; mobileSidebar = false; return; }
    if (typing) return;
    if (event.key === '/') { event.preventDefault(); focusSearch(); }
    if (event.key === 'ArrowDown' && shown.length) { event.preventDefault(); const i = shown.findIndex(e => e.id === selected?.id); select(shown[Math.min(shown.length - 1, i + 1)]); }
    if (event.key === 'ArrowUp' && shown.length) { event.preventDefault(); const i = shown.findIndex(e => e.id === selected?.id); select(shown[Math.max(0, i - 1)]); }
  }
  async function migrateLegacySettings() {
    const store = localforage.createInstance({ name: 'settings' });
    try {
      if (!localStorage.getItem('zenpkgs-search-preferences')) {
        const old = await store.getItem<Record<string, unknown>>('user_prefs');
        if (old) {
          prefs = { ...defaults, theme: old.theme === 'light' ? 'light' : 'dark', accent: legacyAccent[String(old.accent)] || defaults.accent, reduceMotion: Boolean(old.reducedMotion), customCss: String(old.customCSS || ''), githubToken: String(old.ghToken || ''), geminiKey: String(old.geminiKey || '') };
          persistPrefs();
        }
      }
      const old = await store.getItem<{ favorites?: string[]; recents?: string[]; searchHistory?: string[]; scratchpadConfig?: string }>('user_history');
      if (old) {
        const convert = (items: string[] = []) => items.map(key => {
          const at = key.indexOf(':');
          const kind = key.slice(0, at); const path = key.slice(at + 1);
          return kind === 'pkgs' ? (path.startsWith('pkgs.') ? path : `pkgs.${path}`) : path;
        });
        if (!localStorage.getItem('zenpkgs-search-favorites')) { favorites = convert(old.favorites); save('zenpkgs-search-favorites', favorites); }
        if (!localStorage.getItem('zenpkgs-search-recents')) { recents = convert(old.recents); save('zenpkgs-search-recents', recents); }
        if (!localStorage.getItem('zenpkgs-search-searches')) { searchHistory = old.searchHistory || []; save('zenpkgs-search-searches', searchHistory); }
        if (!localStorage.getItem('zenpkgs-search-scratchpad') && old.scratchpadConfig) { scratchpad = old.scratchpadConfig; save('zenpkgs-search-scratchpad', scratchpad); }
      }
    } catch { /* Existing data stays untouched if migration is unavailable. */ }
  }
  onMount(() => {
    applyPrefs(); migrateLegacySettings(); refresh(); listVersions().then(v => versions = v).catch(() => {});
    const resize = new ResizeObserver(() => { if (scroller) viewportHeight = scroller.clientHeight; });
    if (scroller) resize.observe(scroller);
    window.addEventListener('keydown', onKey);
    return () => { resize.disconnect(); window.removeEventListener('keydown', onKey); };
  });
</script>

<svelte:head><title>{selected ? `${selected.id} · ZenPkgs` : 'ZenPkgs Search'}</title></svelte:head>
<div class="app">
  <header class="topbar">
    <button class="icon-button mobile-menu" aria-label="Open navigation" onclick={() => mobileSidebar = !mobileSidebar}>☰</button>
    <div class="brand"><span class="brand-mark">◈</span><span>ZenPkgs</span></div>
    <div class="search-wrap"><input bind:this={searchInput} bind:value={query} onkeydown={e => { if (e.key === 'Enter') rememberSearch(); }} type="search" aria-label="Search registry" placeholder="Search registry…" /><kbd>/</kbd></div>
    <button class="icon-button" title="Surprise me" aria-label="Random package" onclick={randomEntry}>⤨</button>
    <div class="version-wrap"><button class="version-button" onclick={() => versionOpen = !versionOpen} aria-expanded={versionOpen}>{currentVersion} <span>⌄</span></button>
      {#if versionOpen}<div class="version-menu"><button onclick={refresh}>Latest Commit</button>{#each versions as version}<button onclick={() => selectVersion(version)}>{version.label}</button>{/each}<div class="version-actions"><label class="button">Upload JSON<input type="file" accept=".json,application/json" onchange={upload} hidden /></label><button onclick={() => { versionOpen = false; listVersions().then(v => versions = v); }}>Refresh</button></div><p>Compare with:</p>{#each versions as version}<button onclick={() => chooseDiffBase(version)}>Diff vs {version.label}</button>{/each}</div>{/if}
    </div>
    <button class="icon-button" title="Command palette" aria-label="Command palette" onclick={() => modal = 'palette'}>⌘</button>
    <button class="icon-button" title="Menu" aria-label="Settings and news" onclick={() => modal = 'settings'}>☰</button>
  </header>
  <div class="workspace">
    <aside class:open={mobileSidebar} class="sidebar"><div class="sidebar-heading">Explore</div>
      {#each ['Packages', 'Options', 'Maintainers', 'Favorites', 'Recent'] as item}<button class:active={section === item} onclick={() => chooseSection(item as typeof section)}><span>{item === 'Packages' ? '▦' : item === 'Options' ? '⚙' : item === 'Maintainers' ? '♙' : item === 'Favorites' ? '☆' : '◷'}</span>{item}</button>{/each}
      <div class="sidebar-bottom"><button onclick={() => modal = 'scratchpad'}>✎ Config Scratchpad</button><button onclick={openNews}>◉ Developer News</button><button onclick={() => modal = 'settings'}>⚙ Settings</button><button onclick={() => modal = 'about'}>ⓘ About</button></div>
    </aside>
    <main class="browser"><div class="section-heading"><div><span class="eyebrow">Registry</span><h1>{section}</h1></div><span class="count">{shown.length.toLocaleString()} {shown.length === 1 ? 'entry' : 'entries'}</span></div>
      {#if loading}<div class="empty"><span class="spinner"></span>Fetching Registry…</div>{:else if error}<div class="empty error" role="alert">{error} <button onclick={refresh}>Retry</button></div>{:else if !shown.length}<div class="empty">No matching entries. {#if query}<button onclick={() => query = ''}>Clear search</button>{/if}</div>{:else}
        <div class="tree-scroll" bind:this={scroller} onscroll={e => scrollTop = e.currentTarget.scrollTop} role="listbox" aria-label={`${section} registry`}><div class="virtual-space" style:height={`${shown.length * rowHeight}px`}>{#each visible as entry (entry.kind + entry.id)}<button class:selected={selected?.id === entry.id} class="tree-row" style:top={`${shown.indexOf(entry) * rowHeight}px`} role="option" aria-selected={selected?.id === entry.id} onclick={() => select(entry)}><span class="row-icon">{entry.kind === 'Package' ? '▣' : entry.kind === 'Option' ? '◇' : '♙'}</span><span class="row-label">{entry.id}</span><span class="row-type">{entry.kind}</span></button>{/each}</div></div>
      {/if}
    </main>
    <section class="inspector" aria-label="Entry details">{#if selected}<div class="inspector-inner"><div class="eyebrow">{selected.kind}</div><h2>{selected.meta.name || selected.id}</h2><p class="entry-id">{selected.id}</p><div class="inspector-actions"><button onclick={toggleFavorite} title="Toggle favorite">{favorites.includes(selected.id) ? '★' : '☆'} Favorite</button><button onclick={() => selected && copy(selected.id)}>Copy ID</button><button onclick={addToScratchpad}>+ Scratchpad</button></div>
      {#if selected.meta.summary}<p class="summary">{selected.meta.summary}</p>{/if}
      {#if selected.meta.description}<div class="markdown">{@html DOMPurify.sanitize(marked.parse(String(selected.meta.description), { async: false }) as string)}</div>{/if}
      {#if selected.kind === 'Package'}<div class="detail-block"><h3>Install</h3><code>nix shell zenpkgs#{selected.id.replace(/^pkgs\./, '')}</code><button onclick={() => copy(`nix shell zenpkgs#${selected?.id.replace(/^pkgs\./, '')}`)}>Copy</button></div>{#if categories(selected.meta).length}<div class="detail-block"><h3>Categories</h3>{#each categories(selected.meta) as category}<p>{category}</p>{/each}</div>{/if}{/if}
      {#if selected.kind === 'Option'}<div class="detail-block"><h3>Type</h3><p>{selected.meta.type || 'Unknown'}</p>{#if selected.meta.default !== undefined}<h3>Default</h3><code>{String(selected.meta.default)}</code>{/if}<label>Value for scratchpad<input bind:value={optionValue} placeholder="true" /></label></div>{/if}
      {#if selected.kind === 'Maintainer'}{#if selected.meta.github}<a href={`https://github.com/${selected.meta.github}`} target="_blank" rel="noreferrer">GitHub: {selected.meta.github}</a>{/if}{/if}
      {#if diffBase}<div class="detail-block"><h3>Compared with {diffLabel}</h3><p>{diffStatus(selected)}</p></div>{/if}
      <div class="detail-block"><button onclick={explain} disabled={aiBusy}>✦ {aiBusy ? 'Explaining…' : 'Explain with AI'}</button>{#if aiText}<div class="markdown">{@html DOMPurify.sanitize(marked.parse(aiText, { async: false }) as string)}</div>{/if}</div>
    </div>{:else}<div class="inspector-empty"><span>◇</span><h2>Select an entry</h2><p>Browse packages, options, and maintainers from the ZenPkgs registry.</p></div>{/if}</section>
  </div>
  {#if status}<div class="status" role="status">{status}</div>{/if}
</div>

{#if modal}<div class="modal-backdrop" role="presentation" onclick={e => { if (e.target === e.currentTarget) modal = ''; }}><div class="modal" role="dialog" aria-modal="true" aria-label={modal}><header><h2>{modal === 'palette' ? 'Command Palette' : modal === 'scratchpad' ? 'Config Scratchpad' : modal === 'diff' ? 'Version Comparison' : modal === 'news' ? 'Developer News' : modal === 'settings' ? 'Settings' : 'About ZenPkgs Search'}</h2><button class="icon-button" aria-label="Close" onclick={() => modal = ''}>×</button></header>
  {#if modal === 'palette'}<input bind:value={paletteQuery} placeholder="Type a command…" aria-label="Filter commands" />{#each paletteItems as item}<button class="palette-item" onclick={() => { item.action(); if (modal === 'palette') modal = ''; }}>{item.label}</button>{/each}{#if !paletteItems.length}<p>No commands found.</p>{/if}
  {:else if modal === 'scratchpad'}<p>Edit your Nix configuration. Changes save locally as you type.</p><textarea class="scratchpad" bind:value={scratchpad} oninput={() => save('zenpkgs-search-scratchpad', scratchpad)} spellcheck="false"></textarea><div class="modal-actions"><button onclick={() => copy(scratchpad)}>Copy Config</button><button onclick={() => { scratchpad = ''; save('zenpkgs-search-scratchpad', scratchpad); }}>Clear</button></div>
  {:else if modal === 'settings'}<div class="settings-grid"><label>Theme<select bind:value={prefs.theme} onchange={persistPrefs}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Accent color<input type="color" bind:value={prefs.accent} oninput={persistPrefs} /></label><label class="check"><input type="checkbox" bind:checked={prefs.reduceMotion} onchange={persistPrefs} /> Reduce motion</label><label>Custom CSS<textarea bind:value={prefs.customCss} oninput={persistPrefs} rows="5"></textarea></label><label>GitHub token<input type="password" bind:value={prefs.githubToken} oninput={persistPrefs} autocomplete="off" /></label><label>Gemini API key<input type="password" bind:value={prefs.geminiKey} oninput={persistPrefs} autocomplete="off" /></label></div><p>Keyboard: / search, Ctrl+K commands, ↑/↓ entries, Esc close.</p>
  {:else if modal === 'news'}{#if news.length}{#each news as item}<article class="news-item"><h3>{item.title || 'Update'}</h3><small>{item.date || ''}</small>{#if item.body}<div class="markdown">{@html DOMPurify.sanitize(marked.parse(item.body, { async: false }) as string)}</div>{/if}{#if item.url}<a href={item.url} target="_blank" rel="noreferrer">Read more</a>{/if}</article>{/each}{:else}<p>No news available.</p>{/if}
  {:else if modal === 'diff'}<p>Comparing {currentVersion} with {diffLabel}. Select an entry to inspect changes.</p><div class="modal-actions"><button onclick={() => { diffBase = null; modal = ''; }}>Clear comparison</button></div>
  {:else}<p>ZenPkgs Search browses packages, options, and maintainers from the ZenPkgs registry.</p><p><a href="https://github.com/zenos-n/zenpkgs-search" target="_blank" rel="noreferrer">Source code</a> · <a href="https://github.com/zenos-n/zenpkgs-search/blob/main/LICENSE" target="_blank" rel="noreferrer">License</a></p>{/if}
  </div></div>{/if}
