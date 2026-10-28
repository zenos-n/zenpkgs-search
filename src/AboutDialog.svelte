<script lang="ts">
	import { tick } from 'svelte';
	import type { LegacyAboutLinks } from './LegacyDialogs.svelte';
	import { stackEnter, stackExit } from './lib/motion';
	export let aboutPage: 'main' | 'legal' | 'credits';
	export let aboutLinks: LegacyAboutLinks;
	export let appVersion: string;
	export let direction: number;
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
					}}><strong>Legal</strong><span aria-hidden="true">›</span></button
				>
				<button
					class="legacy-row"
					onclick={async () => {
						direction = 1;
						await tick();
						aboutPage = 'credits';
					}}><strong>Credits</strong><span aria-hidden="true">›</span></button
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
			<h3>License</h3>
			<p>
				ZenPkgs Search is open-source software. Review the complete license terms in the project
				repository.
			</p>
			<a class="action-link" href={aboutLinks.license} target="_blank" rel="noreferrer"
				>View license on GitHub</a
			>
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
					<strong>GNOME</strong><small>For Adwaita</small>
				</div>
				<div class="legacy-row stacked-row">
					<strong>NixOS</strong><small>For the ecosystem</small>
				</div>
			</div>
		</div>
	{/if}
</div>
