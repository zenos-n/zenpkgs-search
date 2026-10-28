<script lang="ts">
	import { tick } from 'svelte';
	import './action-dialogs.css';
	import { modalBackdrop, modalWindow } from './lib/motion';
	export let open: '' | 'palette' | 'diff';
	export let paletteQuery: string;
	export let paletteItems: Array<{ label: string; action: () => void }>;
	export let currentVersion: string;
	export let diffLabel: string;
	export let onclose: () => void;
	export let onselect: (item: { label: string; action: () => void }) => void;
	export let oncleardiff: () => void;
	let input: HTMLInputElement;
	$: if (open === 'palette') tick().then(() => input?.focus());
</script>

{#if open === 'palette'}
	<div
		class="command-overlay"
		transition:modalBackdrop
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) onclose();
		}}
	>
		<div
			class="command-window"
			role="dialog"
			aria-modal="true"
			aria-label="Command Palette"
			transition:modalWindow
		>
			<div class="command-input-wrapper">
				<input
					bind:this={input}
					bind:value={paletteQuery}
					placeholder="Type a command…"
					aria-label="Filter commands"
				/>
			</div>
			<div class="command-list">
				{#each paletteItems as item, index}
					<button class:active={index === 0} onclick={() => onselect(item)}>{item.label}</button>
				{/each}
				{#if !paletteItems.length}<p>No commands found.</p>{/if}
			</div>
		</div>
	</div>
{:else if open === 'diff'}
	<div
		class="modal-backdrop"
		transition:modalBackdrop
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) onclose();
		}}
	>
		<div
			class="modal"
			role="dialog"
			aria-modal="true"
			aria-label="Version Comparison"
			transition:modalWindow
		>
			<header>
				<h2>Version Comparison</h2>
				<button class="icon-button" aria-label="Close" onclick={onclose}>×</button>
			</header>
			<p>Comparing {currentVersion} with {diffLabel}. Select an entry to inspect changes.</p>
			<div class="modal-actions"><button onclick={oncleardiff}>Clear comparison</button></div>
		</div>
	</div>
{/if}
