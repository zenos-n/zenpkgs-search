<script lang="ts">
	import { tick } from 'svelte';
	import DOMPurify from 'dompurify';
	import { marked } from 'marked';
	import type { LegacyAboutLinks } from './LegacyDialogs.svelte';
	import { stackEnter, stackExit } from './lib/motion';
	export let aboutPage: 'main' | 'legal' | 'credits';
	export let aboutLinks: LegacyAboutLinks;
	export let appVersion: string;
	export let direction: number;

	const licenseFallback = `
# NAPALM License 2.0
(Non Aggression Principle Anti-License Mandate)

1. **Freedom**: You are free to use, modify, and distribute this software for any purpose.
2. **Non-Aggression**: You may not use this software to initiate force, violence, or coercion against other individuals or their property.
3. **Liability**: The author is not liable for any damages arising from the use of this software.

*Note: This is a local fallback.*
`;
	let licenseContent: Promise<string> | undefined;
	$: if (aboutPage === 'legal' && !licenseContent) licenseContent = loadLicense();

	async function loadLicense(): Promise<string> {
		let markdown = licenseFallback;
		try {
			const response = await fetch(
				'https://raw.githubusercontent.com/negative-zero-inft/nap-license/master/LICENSE'
			);
			if (!response.ok) throw new Error('License fetch failed');
			markdown = await response.text();
		} catch {
			// Keep the original local fallback available when offline.
		}
		return DOMPurify.sanitize(marked.parse(markdown, { async: false }) as string);
	}
</script>

<div class="legacy-stack">
	{#if aboutPage === 'main'}
		<div
			class="stack-page about-main"
			data-direction={direction}
			in:stackEnter={{ direction }}
			out:stackExit
		>
			<svg class="about-logo" viewBox="0 0 16 16" aria-hidden="true"
				><path
					fill-rule="evenodd"
					d="M12.5 7a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-9-3a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
				/></svg
			>
			<h1>ZenPkgs Browser</h1>
			<span class="version-chip">{appVersion}</span>
			<div class="legacy-group about-links">
				<button
					class="legacy-row"
					onclick={async () => {
						direction = 1;
						await tick();
						aboutPage = 'legal';
					}}
					><strong>Legal</strong><svg class="about-chevron" viewBox="0 0 24 24" aria-hidden="true"
						><path d="m9 18 6-6-6-6" /></svg
					></button
				>
				<button
					class="legacy-row"
					onclick={async () => {
						direction = 1;
						await tick();
						aboutPage = 'credits';
					}}
					><strong>Credits</strong><svg class="about-chevron" viewBox="0 0 24 24" aria-hidden="true"
						><path d="m9 18 6-6-6-6" /></svg
					></button
				>
				<div class="legacy-row">
					<strong>Registry Source</strong><a
						href={aboutLinks.registry}
						target="_blank"
						rel="noreferrer">GitHub</a
					>
				</div>
				<div class="legacy-row">
					<strong>Website Source</strong><a
						href={aboutLinks.website}
						target="_blank"
						rel="noreferrer">GitHub</a
					>
				</div>
			</div>
		</div>
	{:else if aboutPage === 'legal'}
		<div
			class="stack-page legal-page"
			data-direction={direction}
			in:stackEnter={{ direction }}
			out:stackExit
		>
			{#await licenseContent}
				<div class="loading-state" role="status">
					<div class="legacy-spinner" aria-hidden="true"></div>
					<p>Loading License...</p>
				</div>
			{:then html}
				<div class="markdown-body">{@html html ?? ''}</div>
			{/await}
		</div>
	{:else}
		<div
			class="stack-page credits-page"
			data-direction={direction}
			in:stackEnter={{ direction }}
			out:stackExit
		>
			<h3>Core Team</h3>
			<div class="legacy-group">
				<div class="legacy-row"><span>Lead Designer</span><strong>doromiert</strong></div>
				<div class="legacy-row">
					<span>Developers</span><strong>CatNowBlue, Zaka</strong>
				</div>
			</div>
			<h3>Special Thanks</h3>
			<div class="legacy-group">
				<div class="legacy-row stacked-row">
					<strong>Gnome</strong><small>For Adwaita</small>
				</div>
				<div class="legacy-row stacked-row">
					<strong>Google</strong><small>For Gemini</small>
				</div>
				<div class="legacy-row stacked-row">
					<strong>Blade0 &amp; Jeyphr</strong><small>For being cool</small>
				</div>
			</div>
		</div>
	{/if}
</div>
